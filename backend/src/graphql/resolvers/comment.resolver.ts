"use client";

import { GraphQLError } from "graphql";
import * as queries from "../../db/queries";
import { insertCommentSchema, NewCommentInput } from "../../db/validation";
import { GraphQLContext } from "../../authorization/context";
import { db } from "../../db";
import { eq, and, inArray } from "drizzle-orm";
import { comments, orders, orderItems } from "../../db/schema";
import axios from "axios";
import { redisClient } from "../../lib/redis";

const PRODUCT_CACHE_PREFIX = "product:id:";
const PRODUCTS_LIST_CACHE_KEY = "products:all";

// AI Agent URL from environment variables
const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://localhost:8080";

// --- Moderation Helper Functions ---

interface ModerationResult {
  decision: "approved" | "rejected" | "pending";
  reason: string;
  confidence: number;
  success: boolean;
}

/**
 * Sends the comment to the Rust AI Agent for review.
 * If the agent is unreachable, the comment is marked as 'pending' for safety.
 */
async function moderateComment(
  comment: string,
  productTitle: string,
): Promise<ModerationResult> {
  try {
    const response = await axios.post(
      `${AI_AGENT_URL}/moderate`,
      {
        comment,
        product_title: productTitle,
      },
      { timeout: 15000 },
    );

    return response.data as ModerationResult;
  } catch (error: any) {
    console.error("Moderation agent unreachable:", error.message);
    // Safety fallback: mark as pending for manual admin review if AI is down
    return {
      decision: "pending",
      reason: "AI moderation service unavailable — flagged for admin review",
      confidence: 0,
      success: false,
    };
  }
}

/**
 * Retrieves the product title to provide context for the AI moderation.
 */
async function getProductTitle(productId: string): Promise<string> {
  try {
    const product = await db.query.products.findFirst({
      where: (p) => eq(p.id, productId),
      columns: { title: true },
    });
    return product?.title || "Unknown Product";
  } catch {
    return "Unknown Product";
  }
}

// --- Resolvers ---

export const commentResolvers = {
  Query: {
    /**
     * Fetch a single comment by its unique ID
     */
    getCommentById: async (_: unknown, { id }: { id: string }) => {
      try {
        const comment = await queries.getCommentById(id);
        if (!comment) {
          throw new GraphQLError("Comment not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return comment;
      } catch (error: any) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to get Comment");
      }
    },

    /**
     * Admin Dashboard Query: Fetch all comments with 'pending' status
     */
    getPendingComments: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext,
    ) => {
      if (context.role !== "admin") {
        throw new GraphQLError("Forbidden: Admin only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return db.query.comments.findMany({
        where: (c) => eq(c.status, "pending"),
        with: {
          user: true,
          product: { columns: { id: true, title: true, imageUrl: true } },
        },
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
    },
  },

  Mutation: {
    /**
     * Create a new comment/review with AI moderation.
     * Flow: Auth -> Validation -> Purchase Check -> AI Moderation -> DB Save -> Cache Invalidation
     */
    createComment: async (
      _: unknown,
      { input }: { input: NewCommentInput & { productId: string } },
      context: GraphQLContext,
    ) => {
      // 1. Authentication check
      if (!context.userId) {
        throw new GraphQLError("You must be logged in to post a review", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // 2. Input validation using Zod
      const validation = insertCommentSchema.safeParse({
        ...input,
        userId: context.userId,
      });

      if (!validation.success) {
        throw new GraphQLError("Comment validation failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: validation.error.flatten().fieldErrors,
          },
        });
      }

      try {
        // 3. Purchase Verification: Ensure the user actually bought the item
        const verifiedPurchase = await db
          .select()
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(
            and(
              eq(orders.userId, context.userId),
              eq(orderItems.productId, input.productId),
              inArray(orders.status, ["delivered", "completed"]),
            ),
          )
          .limit(1);

        if (!verifiedPurchase || verifiedPurchase.length === 0) {
          throw new GraphQLError(
            "You can only review products you have actually purchased and received",
            { extensions: { code: "FORBIDDEN" } },
          );
        }

        // 4. AI Moderation Check
        const productTitle = await getProductTitle(input.productId);
        const moderation = await moderateComment(input.content, productTitle);

        // Normalize decision to handle potential case sensitivity from AI agent
        const decision = moderation.decision.toLowerCase();

        console.log(
          `[Moderation] decision=${decision} confidence=${moderation.confidence} reason="${moderation.reason}"`,
        );

        // If rejected by AI, do not save to database
        if (decision === "rejected") {
          throw new GraphQLError(
            "Your review was not published as it violates our community guidelines.",
            {
              extensions: {
                code: "COMMENT_REJECTED",
                reason: moderation.reason,
              },
            },
          );
        }

        // 5. Database Insertion with calculated status
        const [newComment] = await db
          .insert(comments)
          .values({
            content: input.content,
            rating: input.rating,
            productId: input.productId,
            userId: context.userId,
            // Status is "approved" (public) or "pending" (hidden until admin review)
            status: decision === "approved" ? "approved" : "pending",
            moderationReason:
              decision === "pending" ? moderation.reason : null,
          })
          .returning();

        // 6. Cache Invalidation
        await redisClient.del(`${PRODUCT_CACHE_PREFIX}${input.productId}`);
        await redisClient.del(PRODUCTS_LIST_CACHE_KEY);

        return newComment;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        console.error("Create Comment Error:", error);
        throw new GraphQLError("Failed to post comment");
      }
    },

    /**
     * Delete a comment (Author or Admin only)
     */
    deleteComment: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHORIZED" },
        });
      }

      try {
        const existingComment = await queries.getCommentById(id);

        if (!existingComment) {
          throw new GraphQLError("Comment not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (
          existingComment.userId !== context.userId &&
          context.role !== "admin"
        ) {
          throw new GraphQLError("Not authorized to delete this comment", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const deletedComment = await queries.deleteComment(id);

        // Cache Invalidation
        await redisClient.del(
          `${PRODUCT_CACHE_PREFIX}${existingComment.productId}`,
        );
        await redisClient.del(PRODUCTS_LIST_CACHE_KEY);

        return deletedComment;
      } catch (error: any) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || "Failed to delete comment");
      }
    },

    /**
     * Admin action to manually approve a pending comment
     */
    approveComment: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      if (context.role !== "admin") {
        throw new GraphQLError("Forbidden: Admin only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const [updated] = await db
        .update(comments)
        .set({ status: "approved", moderationReason: null })
        .where(eq(comments.id, id))
        .returning();

      if (!updated) {
        throw new GraphQLError("Comment not found");
      }

      // Invalidate cache to show the newly approved comment
      await redisClient.del(`${PRODUCT_CACHE_PREFIX}${updated.productId}`);
      await redisClient.del(PRODUCTS_LIST_CACHE_KEY);

      return updated;
    },

    /**
     * Admin action to manually reject a pending comment
     */
    rejectComment: async (
      _: unknown,
      { id, reason }: { id: string; reason?: string },
      context: GraphQLContext,
    ) => {
      if (context.role !== "admin") {
        throw new GraphQLError("Forbidden: Admin only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const [updated] = await db
        .update(comments)
        .set({
          status: "rejected",
          moderationReason: reason || "Rejected by admin",
        })
        .where(eq(comments.id, id))
        .returning();

      if (!updated) {
        throw new GraphQLError("Comment not found");
      }

      // Invalidate cache to ensure rejected comment is removed from the product view immediately
      await redisClient.del(`${PRODUCT_CACHE_PREFIX}${updated.productId}`);
      await redisClient.del(PRODUCTS_LIST_CACHE_KEY);

      return updated;
    },
  },
};