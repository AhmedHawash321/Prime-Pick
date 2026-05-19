import * as queries from "../../db/queries";
import { GraphQLError } from "graphql";
import {
  insertProductSchema,
  updateProductSchema,
  NewProductInput,
} from "../../db/validation";
import { ROLES } from "../../config/roles";
import { GraphQLContext } from "../../authorization/context";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  products,
  orders,
  orderItems,
  Product,
  Comment,
} from "../../db/schema";
import { redisClient } from "../../lib/redis";

/**
 * Cache Configurations
 */
const PRODUCT_CACHE_PREFIX = "product:id:";
const PRODUCTS_LIST_CACHE_KEY = "products:all";
const CACHE_TTL = 1800; // 30 minutes

export interface GetProductsArgs {
  limit?: number;
  offset?: number;
  filter?: {
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  };
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  categoryId?: string;
}

/**
 * Extended Product type to include relations loaded via Drizzle 'with'
 */
type ProductWithComments = Product & {
  comments?: Comment[];
};

export const productResolvers = {
  Product: {
    /**
     * Computed field to return the total number of comments for a product.
     */
    commentCount: (parent: ProductWithComments): number => {
      return parent.comments?.length || 0;
    },

    /**
     * Computed field to calculate the average rating from product comments.
     */
    avgRating: (parent: ProductWithComments): number => {
      if (!parent.comments || parent.comments.length === 0) return 0;

      const sum = parent.comments.reduce(
        (acc: number, c: Comment): number => acc + (c.rating || 0),
        0,
      );

      return parseFloat((sum / parent.comments.length).toFixed(1));
    },
  },

  Query: {
    /**
     * Check if a user is eligible to review a product.
     * Eligibility requires a 'delivered' or 'completed' order containing the specific productId.
     */
    canUserReview: async (
      _: unknown,
      { productId }: { productId: string },
      context: GraphQLContext,
    ): Promise<boolean> => {
      if (!context.userId) return false;

      try {
        const deliveredOrder = await db.query.orders.findFirst({
          where: and(
            eq(orders.userId, context.userId),
            inArray(orders.status, ["delivered", "completed"]),
          ),
          with: {
            items: {
              where: eq(orderItems.productId, productId),
            },
          },
        });
        //using !! to make sure value will always be boolean
        return !!deliveredOrder && deliveredOrder.items.length > 0;
      } catch (error) {
        console.error("canUserReview Error:", error);
        return false;
      }
    },

    /**
     * Fetch all products with caching.
     * Caches the main storefront list when no filters/search are applied.
     */
    /**
     * Fetch all products with pagination-aware caching.
     * Only caches the base list (no search/filters) to maintain high hit rates.
     */
    getProducts: async (
      _: unknown,
      { limit = 10, offset = 0, filter }: GetProductsArgs,
    ): Promise<Product[]> => {
      try {
        // Optimization: Only cache the base list without filters/search
        const isBaseQuery =
          !filter?.search && !filter?.minPrice && !filter?.maxPrice;

        // Generate a dynamic cache key that includes pagination parameters
        // This prevents different pages from overwriting each other in Redis
        const paginationCacheKey = `${PRODUCTS_LIST_CACHE_KEY}:L${limit}:O${offset}`;

        if (isBaseQuery) {
          const cached = await redisClient.get(paginationCacheKey);
          if (cached) return JSON.parse(cached);
        }

        const result = await queries.getProducts(limit, offset, filter);

        // Store the specific page in Redis if it's a base query
        if (isBaseQuery && result) {
          await redisClient.setEx(
            paginationCacheKey,
            CACHE_TTL,
            JSON.stringify(result),
          );
        }

        return result;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        console.error("Fetch Products Error:", error);
        throw new GraphQLError("Error in fetching products", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    /**
     * Fetch a single product by ID with Redis caching.
     */
    getProductById: async (
      _: unknown,
      { id }: { id: string },
    ): Promise<Product> => {
      const cacheKey = `${PRODUCT_CACHE_PREFIX}${id}`;
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const product = await queries.getProductById(id);
        if (!product) {
          throw new GraphQLError("Product Not Found or has been deleted", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(product));
        return product;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    },

    /**
     * Fetch products listed by a specific user.
     */
    getProductsByUserId: async (
      _: unknown,
      { userId }: { userId: string },
    ): Promise<Product[]> => {
      try {
        return await queries.getProductsByUserId(userId);
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to get products for this user");
      }
    },
  },

  Mutation: {
    /**
     * Create Product - Validates input and invalidates global list/category caches.
     */
    createProduct: async (
      _: unknown,
      { input }: { input: NewProductInput & { categoryId: string } },
      context: GraphQLContext,
    ): Promise<Product> => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHORIZED" },
        });
      }

      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Only admins can create products", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const validation = insertProductSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("Validation Failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: validation.error.flatten().fieldErrors,
          },
        });
      }

      try {
        // 1. Destructure and re-assign the verified userId from context
        const { userId: _, ...productData } = validation.data;

        const newProduct = await queries.createProduct({
          ...productData,
          userId: context.userId as string,
          categoryId: input.categoryId,
        });

        // 2. Type Guard: Ensure newProduct exists before proceeding
        // This solves the 'Product | undefined' TypeScript error
        if (!newProduct) {
          throw new GraphQLError("Failed to create product in database", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }

        // 3. Cache Invalidation (Only runs if product was successfully created)
        // Using Promise.all for faster execution
        await Promise.all([
          redisClient.del(PRODUCTS_LIST_CACHE_KEY),
          redisClient.del("categories:all"),
        ]);

        return newProduct;
      } catch (error) {
        console.error("DB Error:", error);
        throw new GraphQLError("Failed to create product.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    /**
     * Update Product - Validates permissions (Admin or Owner) and purges specific caches.
     */
    updateProduct: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateProductInput },
      context: GraphQLContext,
    ): Promise<Product> => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHORIZED" },
        });
      }

      const productData = await db.query.products.findFirst({
        where: and(eq(products.id, id), isNull(products.deletedAt)),
      });

      if (!productData) {
        throw new GraphQLError("Product not found or has been deleted", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const isAdmin = context.role === ROLES.ADMIN;
      const isOwner = productData.userId === context.userId;

      if (!isAdmin && !isOwner) {
        throw new GraphQLError("Forbidden: Only owner or admin can update", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const validation = updateProductSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("Validation Failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: validation.error.flatten().fieldErrors,
          },
        });
      }

      // Filter out undefined fields to prevent overwriting existing data with nulls
      const cleanData = Object.fromEntries(
        Object.entries(validation.data).filter(
          ([, value]) => value !== undefined,
        ),
      );

      try {
        const updated = await queries.updateProduct(
          id,
          context.userId,
          isAdmin,
          cleanData,
        );

        // Purge all relevant caches to prevent stale data display
        await redisClient.del(PRODUCTS_LIST_CACHE_KEY);
        await redisClient.del(`${PRODUCT_CACHE_PREFIX}${id}`);
        await redisClient.del("categories:all");

        return updated;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          error instanceof Error ? error.message : "Update failed",
          {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        );
      }
    },

    /**
     * Delete Product (Soft Delete) - Removes item from visibility and purges caches.
     */
    deleteProduct: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<Product> => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHORIZED" },
        });
      }

      const productData = await db.query.products.findFirst({
        where: and(eq(products.id, id), isNull(products.deletedAt)),
      });

      if (!productData) {
        throw new GraphQLError("Product not found or already deleted", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const isAdmin = context.role === ROLES.ADMIN;
      const isOwner = productData.userId === context.userId;

      if (!isAdmin && !isOwner) {
        throw new GraphQLError("Forbidden: Only owner or admin can delete", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      try {
        const result = await queries.deleteProduct(id, context.userId, isAdmin);

        // Immediate Cache Purge
        await redisClient.del(PRODUCTS_LIST_CACHE_KEY);
        await redisClient.del(`${PRODUCT_CACHE_PREFIX}${id}`);
        await redisClient.del("categories:all");

        return result;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          error instanceof Error ? error.message : "Delete failed",
          {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        );
      }
    },
  },
};