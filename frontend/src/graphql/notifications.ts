import { gql } from "@apollo/client";

// --- 1. Queries ---

// Query to get user notifications with limit
export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications($limit: Int) {
    getMyNotifications(limit: $limit) {
      id
      userId
      type
      title
      message
      data
      isRead
      createdAt
    }
  }
`;

// Query to get unread notifications count
export const GET_UNREAD_NOTIFICATIONS_COUNT = gql`
  query GetUnreadNotificationsCount {
    getUnreadNotificationsCount
  }
`;

// --- 2. Mutations ---

// Mutation to mark a single notification as read
export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      id
      isRead
      title
    }
  }
`;

// Mutation to mark all notifications as read
export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead {
      id
      isRead
    }
  }
`;

// --- 3. Response Interfaces ---

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  /** 
   * 'data' comes as a JSON string from the backend. 
   * Example: '{"orderId":"...", "productIds":["..."]}' 
   */
  data?: string; 
  isRead: boolean;
  createdAt: string;
}

export interface MyNotificationsResponse {
  getMyNotifications: Notification[];
}

export interface UnreadCountResponse {
  getUnreadNotificationsCount: number;
}

export interface MarkAsReadResponse {
  markNotificationAsRead: Notification;
}

export interface MarkAllReadResponse {
  markAllNotificationsAsRead: Notification[];
}