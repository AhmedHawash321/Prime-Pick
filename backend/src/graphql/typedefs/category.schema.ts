export const categoryTypeDefs = `#graphql
  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    imageUrl: String
    products: [Product]
    _count: CategoryStats 
    createdAt: String
  }

  type CategoryStats {
    products: Int
  }

  input CreateCategoryInput {
    name: String!
    slug: String!
    description: String
    imageUrl: String
  }

  input UpdateCategoryInput {
    name: String
    slug: String
    description: String
    imageUrl: String
  }

  extend type Query {
    getCategories(search: String): [Category]   
    getCategoryById(id: ID!): Category
    getCategoryBySlug(slug: String!): Category    
    # Matches your getCategoriesWithCount Query
    getCategoriesCount: [CategoryCount]
  }

  type CategoryCount {
    id: ID!
    name: String!
    slug: String!
    count: Int!
  }

  extend type Mutation {
    createCategory(input: CreateCategoryInput!): Category
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category
    deleteCategory(id: ID!): Category
  }
`;