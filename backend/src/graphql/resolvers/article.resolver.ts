import * as articleQueries from "../../db/queries/article.queries";
import { GraphQLError } from "graphql";
import {
  insertArticleSchema,
  updateArticleSchema,
  NewArticleInput,
  UpdateArticleInput,
} from "../../db/validation";
import { ROLES } from "../../config/roles";
import { GraphQLContext } from "../../authorization/context";
// Import the centralized Redis client
import { redisClient } from "../../lib/redis";

/**
 * Cache Configurations
 * Global constants for managing article caching strategies.
 */
const ARTICLES_LIST_CACHE_KEY = "articles:public:all";
const ARTICLE_SLUG_PREFIX = "article:slug:";
const CACHE_TTL = 3600; // 1 hour for blog posts

export const articleResolvers = {
  Query: {
    /**
     * Fetch all articles.
     * Caches the public list (Published only) to speed up the blog home page.
     */
    getArticles: async (
      _: unknown,
      { search }: { search?: string },
      context: GraphQLContext
    ) => {
      try {
        const isAdmin = context.role === ROLES.ADMIN;

        // Only use Redis for public, non-search requests
        if (!isAdmin && !search) {
          const cached = await redisClient.get(ARTICLES_LIST_CACHE_KEY);
          if (cached) return JSON.parse(cached);
        }

        const articles = await articleQueries.getArticles(isAdmin, search);
        
        // Store in Redis if it's the standard public list
        if (!isAdmin && !search && articles) {
          await redisClient.setEx(ARTICLES_LIST_CACHE_KEY, CACHE_TTL, JSON.stringify(articles));
        }

        return articles ?? [];
      } catch (error) {
        console.error(`[getArticles Resolver Error]:`, error);
        return [];
      }
    },

    /**
     * Fetch a single article by slug.
     * Caches published articles for fast reading.
     */
    getArticleBySlug: async (
      _: unknown, 
      { slug }: { slug: string },
      context: GraphQLContext 
    ) => {
      const isAdmin = context.role === ROLES.ADMIN;
      const cacheKey = `${ARTICLE_SLUG_PREFIX}${slug}`;

      try {
        // Try cache only for public users
        if (!isAdmin) {
          const cached = await redisClient.get(cacheKey);
          if (cached) return JSON.parse(cached);
        }

        const article = await articleQueries.getArticleBySlug(slug, isAdmin);
        
        if (!article) {
          throw new GraphQLError("Article not found or is not published yet", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Only cache if the article is actually published
        if (!isAdmin && article.isPublished) {
          await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(article));
        }

        return article;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Error fetching article by slug");
      }
    },

    /**
     * Fetch an article by ID for Admin Dashboard.
     */
    getArticleById: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Unauthorized: Dashboard access only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      try {
        const article = await articleQueries.getArticleById(id);
        if (!article) {
          throw new GraphQLError("Article Not Found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return article;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Error fetching article by ID");
      }
    },
  },

  Mutation: {
    /**
     * Create a new article.
     * Clears list cache to ensure the new article appears immediately.
     */
    createArticle: async (
      _: unknown,
      { input }: { input: NewArticleInput },
      context: GraphQLContext
    ) => {
      if (context.role !== ROLES.ADMIN || !context.userId) {
        throw new GraphQLError("Forbidden: Admins only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const validation = insertArticleSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("Validation Failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: validation.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const result = await articleQueries.createArticle({
          ...validation.data,
          authorId: context.userId, 
        });

        // Invalidate list cache
        await redisClient.del(ARTICLES_LIST_CACHE_KEY);

        return result;
      } catch (error) {
        console.error("Create Article DB Error:", error);
        throw new GraphQLError("Failed to create article (Check for unique slug)");
      }
    },

    /**
     * Update an article.
     * Handles invalidation of both list and specific slug caches.
     */
    updateArticle: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateArticleInput },
      context: GraphQLContext
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Admins only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // Fetch the current version of the article to check the existing slug
      const currentArticle = await articleQueries.getArticleById(id);
      const oldSlug = currentArticle?.slug;

      const validation = updateArticleSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("Validation Failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: validation.error.flatten().fieldErrors,
          },
        });
      }

      const cleanData = Object.fromEntries(
        Object.entries(validation.data).filter(([, v]) => v !== undefined)
      );

      try {
        const updated = await articleQueries.updateArticle(id, cleanData);

        if (updated) {
          // 1. Purge the main list cache
          await redisClient.del(ARTICLES_LIST_CACHE_KEY);
          
          // 2. Purge the specific slug cache
          await redisClient.del(`${ARTICLE_SLUG_PREFIX}${updated.slug}`);
          
          // 3. If the slug changed, purge the old slug so it doesn't show stale data
          if (oldSlug && oldSlug !== updated.slug) {
            await redisClient.del(`${ARTICLE_SLUG_PREFIX}${oldSlug}`);
          }
        }

        return updated;
      } catch (error) {
        console.error("Update Article DB Error:", error);
        throw new GraphQLError("Update failed");
      }
    },

    /**
     * Delete an article.
     * Removes associated cached data to maintain synchronization.
     */
    deleteArticle: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
      }

      try {
        const deleted = await articleQueries.deleteArticle(id);
        
        if (deleted) {
          await redisClient.del(ARTICLES_LIST_CACHE_KEY);
          await redisClient.del(`${ARTICLE_SLUG_PREFIX}${deleted.slug}`);
        }

        return deleted;
      } catch (error) {
        console.error("Delete Article DB Error:", error);
        throw new GraphQLError("Delete failed");
      }
    },

    /**
     * Toggle Publish/Draft status.
     * Updates cache to reflect visibility changes.
     */
    toggleArticleStatus: async (
      _: unknown,
      { id, isPublished }: { id: string; isPublished: boolean },
      context: GraphQLContext
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
      }

      try {
        const result = await articleQueries.toggleArticleStatus(id, isPublished);
        
        if (result) {
          // Clear list and specific slug to reflect live/draft status change
          await redisClient.del(ARTICLES_LIST_CACHE_KEY);
          await redisClient.del(`${ARTICLE_SLUG_PREFIX}${result.slug}`);
        }

        return result;
      } catch (error) {
        console.error("Toggle Status DB Error:", error);
        throw new GraphQLError("Status update failed");
      }
    },
  },
};