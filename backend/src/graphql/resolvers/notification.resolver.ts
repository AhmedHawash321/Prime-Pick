import * as notificationQueries from "../../db/queries/notification.queries";
import { GraphQLError } from "graphql";
import { GraphQLContext } from "../../authorization/context";
import { redisClient } from "../../lib/redis";

/**
 * Cache settings
 * NOTIF_CACHE_PREFIX: Ensures user-specific scoping in Redis.
 * CACHE_TTL: Matches frontend polling interval (15s) to reduce DB load.
 */
const NOTIF_CACHE_PREFIX = "notifications:user:";
const CACHE_TTL = 15; 

export const notificationResolvers = {
  Query: {
    /**
     * Get notifications for the authenticated user.
     * Uses Redis caching to handle high-frequency polling from the frontend.
     */
    getMyNotifications: async (
      _: unknown,
      { limit }: { limit?: number },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Unique key based on user ID and result limit
      const cacheKey = `${NOTIF_CACHE_PREFIX}${context.userId}:limit:${limit || 20}`;

      try {
        // 1. Try to fetch from Redis cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }

        // 2. If not in cache, fetch from Neon database
        const notifications = await notificationQueries.getAllNotifications(
          context.userId,
          limit || 20
        );

        // 3. Store in Redis with a short TTL (15s)
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(notifications));

        return notifications;
      } catch (error) {
        console.error("Redis Error in getMyNotifications:", error);
        // Fallback to Database if Redis is unavailable
        return await notificationQueries.getAllNotifications(context.userId, limit || 20);
      }
    },

    /**
     * Get the count of unread notifications for the badge icon.
     */
    getUnreadNotificationsCount: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        return 0;
      }

      const notifications = await notificationQueries.getUnreadNotifications(context.userId, 1000);
      return notifications.length;
    },
  },

  Mutation: {
    /**
     * Mark a specific notification as read.
     * Invalidates the user's notification cache to ensure fresh data on the next poll.
     */
    markNotificationAsRead: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const notification = await notificationQueries.markNotificationAsRead(id, context.userId);
      
      if (!notification) {
        throw new GraphQLError("Notification not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Cache Invalidation: Delete all keys matching the user's notification pattern
      const pattern = `${NOTIF_CACHE_PREFIX}${context.userId}:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(keys);

      return notification;
    },

    /**
     * Mark all notifications for the user as read.
     * Clears all relevant cache entries.
     */
    markAllNotificationsAsRead: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const notifications = await notificationQueries.markAllNotificationsAsRead(context.userId);
      
      // Clear all cached notification lists for this user
      const pattern = `${NOTIF_CACHE_PREFIX}${context.userId}:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(keys);

      return notifications;
    },
  },
};
