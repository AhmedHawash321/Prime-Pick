export const userTypeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String
    imageUrl: String
    role: String!
    createdAt: String
    updatedAt: String
  }

  input UpsertUserInput {
    id: ID!
    email: String!
    name: String
    imageUrl: String
    role: String
  }

  input UpdateUserInput {
    name: String
    imageUrl: String
    role: String
  }

  extend type Query {
    getUserById(id: ID!): User
    getMyRole: String
  }

  extend type Mutation {
    syncUser(input: UpsertUserInput!): User  
    updateUser(id: ID!, input: UpdateUserInput!): User
    updateUserRole(userId: ID!, role: String!): User
  }
`;