import { GraphQLError } from "graphql";
import * as userQueries from "../../db/queries/user.queries";
import {
  insertUserSchema,
  updateUserSchema,
  NewUserInput,
  UpdateUserInput,
} from "../../db/validation";
import { GraphQLContext } from "../../authorization/context";
import { ROLES } from "../../config/roles";

export const userResolvers = {
  Query: {
    /**
     * Fetches a specific user by ID.
     * Publicly accessible or restricted based on your privacy needs.
     */
    getUserById: async (_: unknown, { id }: { id: string }) => {
      try {
        const user = await userQueries.getUserById(id);
        if (!user) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return user;
      } catch (error: any) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message);
      }
    },

    /**
     * Returns the role of the currently authenticated user from context.
     * Useful for Frontend UI conditional rendering (e.g., showing Admin Panel).
     */
    getMyRole: async (_: unknown, __: unknown, context: GraphQLContext) => {
      return context.role;
    },
  },

  Mutation: {
    /**
     * Manually syncs Clerk user data with our local database.
     * Note: Our Context already does this automatically, but this acts as an explicit fallback.
     */
    syncUser: async (
      _: unknown, 
      { input }: { input: NewUserInput }, 
      context: GraphQLContext
    ) => {
      // Security: Users can only sync their own record
      if (!context.userId || context.userId !== input.id) {
        throw new GraphQLError(
          "Unauthorized: You can only sync your own profile",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      const validation = insertUserSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("User sync validation failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            errors: validation.error.flatten().fieldErrors,
          },
        });
      }

      try {
        return await userQueries.upsertUser(validation.data);
      } catch (error: any) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || "Failed to sync user");
      }
    },

    /**
     * Updates user profile (name, imageUrl, etc.).
     * Prevents non-admins from changing their own roles.
     */
    updateUser: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateUserInput },
      context: GraphQLContext
    ) => {
      // 1. Authorization: Only the owner or an admin can update
      const isAdmin = context.role === ROLES.ADMIN;
      if (!context.userId || (context.userId !== id && !isAdmin)) {
        throw new GraphQLError("Unauthorized to update this profile", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // 2. Role Protection: Only admin can escalate/change roles
      if (input.role && !isAdmin) {
        throw new GraphQLError("Forbidden: Only admin can update role", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // 3. Role Validation: Check if the role string is a valid enum value
      if (input.role && !Object.values(ROLES).includes(input.role as any)) {
        throw new GraphQLError(`Invalid role. Must be one of: ${Object.values(ROLES).join(", ")}`, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const validation = updateUserSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError("User update validation failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            errors: validation.error.flatten().fieldErrors,
          },
        });
      }

      try {
        // Cleaning the data: removing undefined fields to avoid overwriting DB values with null
        const cleanData = Object.fromEntries(
          Object.entries(validation.data).filter(([_, v]) => v !== undefined)
        );

        const updatedUser = await userQueries.updateUser(id, cleanData);
        if (!updatedUser) {
          throw new GraphQLError("User not found to update", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return updatedUser;
      } catch (error: any) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || "User update failed");
      }
    },

    /**
     * Specialized Admin Mutation for role management.
     */
    updateUserRole: async (
      _: unknown,
      { userId, role }: { userId: string; role: string },
      context: GraphQLContext
    ) => {
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Only admin can update user roles", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (!Object.values(ROLES).includes(role as any)) {
        throw new GraphQLError(`Invalid role. Must be one of: ${Object.values(ROLES).join(", ")}`, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        const updatedUser = await userQueries.updateUser(userId, { role });
        if (!updatedUser) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return updatedUser;
      } catch (error: any) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || "Failed to update user role");
      }
    },
  },
};