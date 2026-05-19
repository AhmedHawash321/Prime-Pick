import { desc, eq, and, lt, sql } from "drizzle-orm";
import { db } from "../index";
import { notifications } from "../schema";

/**
 * Get unread notifications for a user.
 * Uses direct and/eq imports to resolve environment type conflicts.
 */
export const getUnreadNotifications = async (userId: string, limit: number = 20) => {
  return db.query.notifications.findMany({
    where: (fields) => and(eq(fields.userId, userId), eq(fields.isRead, false)),
    orderBy: [desc(notifications.createdAt)],
    limit: limit,
  });
};

/**
 * Get all notifications for a user (read + unread).
 */
export const getAllNotifications = async (userId: string, limit: number = 50) => {
  return db.query.notifications.findMany({
    where: (fields) => eq(fields.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit: limit,
  });
};

/**
 * Create a new notification.
 */
export const createNotification = async (data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: string;
}) => {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      isRead: false,
    })
    .returning();
  
  return notification;
};

/**
 * Mark a specific notification as read.
 * Fixed: Added userId check to ensure the user owns the notification.
 */
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId) // Security: Verify ownership
      )
    )
    .returning();
  
  return updated;
};

/**
 * Mark all notifications as read for a specific user.
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId))
    .returning();
  
  return updated;
};

/**
 * Delete notifications for a user that are older than the specified days.
 * Fixed: Implemented daysOld logic using PostgreSQL interval.
 */
export const deleteOldNotifications = async (userId: string, daysOld: number = 30) => {
  const deleted = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        lt(notifications.createdAt, sql`now() - interval '${sql.raw(daysOld.toString())} days'`) // Only delete old records
      )
    )
    .returning();
  
  return deleted;
};