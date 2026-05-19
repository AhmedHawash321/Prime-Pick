export const productTypeDefs = `#graphql
  type Product {
    id: ID!
    title: String!
    description: String
    price: Float!
    stock: Int!
    imageUrl: String
    userId: ID!
    user: User
    categoryId: ID
    category: Category
    createdAt: String
    updatedAt: String
    # Soft delete timestamp. If null, the product is active.
    deletedAt: String
    comments: [Comment]
    commentCount: Int
    avgRating: Float
  }

  input CreateProductInput {
    title: String!
    description: String!
    price: Float!
    stock: Int!
    imageUrl: String!
    categoryId: ID!
  }

  input UpdateProductInput {
    title: String
    description: String
    price: Float
    stock: Int
    imageUrl: String
    categoryId: ID
  }
    
  input ProductFilterInput {
    search: String
    minPrice: Float
    maxPrice: Float
  }
  
  extend type Query {
    # Returns only active products (deletedAt is null)
    getProducts(limit: Int, offset: Int, filter: ProductFilterInput): [Product]
    # Returns product only if it is not soft-deleted
    getProductById(id: ID!): Product
    # Returns active products belonging to a specific user
    getProductsByUserId(userId: ID!): [Product]
    canUserReview(productId: ID!): Boolean
  }

  type ProductConnection {
    items: [Product!]!
    totalCount: Int!
  }

  extend type Mutation {
    createProduct(input: CreateProductInput!): Product
    updateProduct(id: ID!, input: UpdateProductInput!): Product
    # Marks the product as deleted by setting deletedAt
    deleteProduct(id: ID!): Product
  }
`;