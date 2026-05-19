export const commentTypeDefs = `#graphql
  type Comment {
    id: ID!
    content: String!
    # Rating field (typically 1 to 5)
    rating: Int!
    userId: String!
    # User details for frontend display
    user: User
    productId: ID!
    product: Product

    # Moderation fields
    # "approved" -> visible to public
    # "pending"  -> waiting for admin review
    # "rejected" -> hidden
    status: String!
    moderationReason: String

    createdAt: String
  }

  input CreateCommentInput {
    content: String!
    # Rating must be sent from the frontend when creating a comment
    rating: Int!
    productId: ID!
  }

  extend type Query {
    getCommentById(id: ID!): Comment
    
    # Admin only - returns all pending comments for review
    getPendingComments: [Comment!]!
  }

  extend type Mutation {
    # The resolver handles auth, purchase checks, rating validation, and AI moderation
    createComment(input: CreateCommentInput!): Comment
    deleteComment(id: ID!): Comment

    # Admin moderation actions
    approveComment(id: ID!): Comment!
    rejectComment(id: ID!, reason: String): Comment!
  }
`;