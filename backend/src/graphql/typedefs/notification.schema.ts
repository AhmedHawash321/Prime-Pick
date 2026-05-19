export const notificationTypeDefs = `#graphql
  type Notification {
    id: ID!
    userId: String!
    type: String!
    title: String!
    message: String!
    data: String
    isRead: Boolean!
    createdAt: String
  }

  extend type Query {
    getMyNotifications(limit: Int): [Notification!]!
    getUnreadNotificationsCount: Int!
  }

  extend type Mutation {
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: [Notification!]!
  }
`;