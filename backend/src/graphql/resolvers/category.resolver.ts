import * as categoryQueries from "../../db/queries/category.queries";
import { GraphQLError } from "graphql";
import {
  insertCategorySchema,
  updateCategorySchema,
  NewCategoryInput,
} from "../../db/validation";
import { ROLES } from "../../config/roles";
import { GraphQLContext } from "../../authorization/context";
// Import the centralized Redis client
import { redisClient } from "../../lib/redis";

export interface GetCategoriesArgs {
  search?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  imageUrl?: string;
}

/**
 * Cache keys and TTL constants
 * Using consistent prefixes to manage category-related cache.
 */
const CATEGORIES_CACHE_KEY = "categories:all";
const CATEGORY_SLUG_PREFIX = "category:slug:";
const CACHE_TTL = 3600; // 1 hour

export const categoryResolvers = {
  Query: {
    /**
     * Fetch all categories with optional search filtering.
     * Accessible to everyone to power the public categories page.
     */
    getCategories: async (
      _: unknown,
      { search }: { search?: string },
    ): Promise<any[]> => {
      try {
        // Skip cache for search queries to ensure real-time filtering
        if (!search) {
          const cached = await redisClient.get(CATEGORIES_CACHE_KEY);
          if (cached) return JSON.parse(cached);
        }

        const categories = await categoryQueries.getCategories(search);
        
        // Store in Redis only if it's the standard (non-filtered) list
        if (!search && categories) {
          await redisClient.setEx(CATEGORIES_CACHE_KEY, CACHE_TTL, JSON.stringify(categories));
        }

        return categories ?? [];
      } catch (error) {
        console.error(`[getCategories Resolver Error]:`, error);
        return []; 
      }
    },

    /**
     * Fetch a single category by ID.
     * Restricted to Admins as this is typically used for dashboard editing.
     */
    getCategoryById: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Unauthorized: Dashboard access only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      try {
        const category = await categoryQueries.getCategoryById(id);
        if (!category) {
          throw new GraphQLError("Category Not Found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return category;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Error fetching category by ID");
      }
    },

    /**
     * Fetch a category by slug and cache it.
     * Accessible to everyone to power the public [slug] pages.
     */
    getCategoryBySlug: async (_: unknown, { slug }: { slug: string }) => {
      const cacheKey = `${CATEGORY_SLUG_PREFIX}${slug}`;
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const category = await categoryQueries.getCategoryBySlug(slug);

        if (!category) {
          throw new GraphQLError("Category not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(category));

        return category;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Error fetching category by slug");
      }
    },

    /**
     * Get the count of products within categories.
     * Restricted to Admins for dashboard analytics.
     */
    getCategoriesCount: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      try {
        return await categoryQueries.getCategoriesWithCount();
      } catch (error) {
        throw new GraphQLError("Failed to fetch categories count");
      }
    },
  },

  Mutation: {
    /**
     * Create a new category - Restricted to Admins.
     * Invalidates the categories list cache.
     */
    createCategory: async (
      _: unknown,
      { input }: { input: NewCategoryInput },
      context: GraphQLContext,
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Admins only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const validation = insertCategorySchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("Validation Failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: validation.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const newCategory = await categoryQueries.createCategory(validation.data);
        
        // Clear global list cache so the new category shows up immediately
        await redisClient.del(CATEGORIES_CACHE_KEY);
        
        return newCategory;
      } catch (error) {
        console.error("Create Category DB Error:", error);
        throw new GraphQLError(
          "Failed to create category (Possible duplicate slug)",
        );
      }
    },

    /**
     * Update an existing category.
     * Purges both the list cache and the specific category cache.
     */
    updateCategory: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateCategoryInput },
      context: GraphQLContext,
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Admins only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const validation = updateCategorySchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("Validation Failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: validation.error.flatten().fieldErrors,
          },
        });
      }

      const cleanData = Object.fromEntries(
        Object.entries(validation.data).filter(
          ([, value]) => value !== undefined,
        ),
      );

      try {
        const updated = await categoryQueries.updateCategory(id, cleanData);
        if (!updated) {
          throw new GraphQLError("Category not found for update", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Invalidate both the list and the specific slug cache to prevent stale data
        await redisClient.del(CATEGORIES_CACHE_KEY);
        await redisClient.del(`${CATEGORY_SLUG_PREFIX}${updated.slug}`);

        return updated;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Update failed", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    /**
     * Delete a category.
     * Clean up all associated cache entries upon deletion.
     */
    deleteCategory: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Admins only", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      try {
        const deleted = await categoryQueries.deleteCategory(id);
        
        if (deleted) {
          // Invalidate caches to remove the category from UI immediately
          await redisClient.del(CATEGORIES_CACHE_KEY);
          await redisClient.del(`${CATEGORY_SLUG_PREFIX}${deleted.slug}`);
        }

        return deleted;
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : "Delete failed",
          { extensions: { code: "INTERNAL_SERVER_ERROR" } },
        );
      }
    },
  },
};