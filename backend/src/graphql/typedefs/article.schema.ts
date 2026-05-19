export const articleTypeDefs = `#graphql
  type Article {
    id: ID!
    title: String!
    slug: String!
    summary: String
    content: String!
    readTime: Int
    imageUrl: String
    authorId: String!
    author: User!
    isPublished: Boolean!
    
    # SEO & Metadata fields for search engine indexing
    metaTitle: String
    metaDescription: String
    keywords: String
    
    createdAt: String!
    updatedAt: String!
  }

  input CreateArticleInput {
    title: String!
    slug: String!
    summary: String
    content: String!
    readTime: Int
    imageUrl: String
    
    # Allows setting the status (Draft/Published) upon initial creation
    isPublished: Boolean 
    
    # SEO specific inputs
    metaTitle: String
    metaDescription: String
    keywords: String
  }

  input UpdateArticleInput {
    title: String
    slug: String
    summary: String
    content: String
    readTime: Int
    imageUrl: String
    
    # Allows updating publication status during content edits
    isPublished: Boolean 
    
    # SEO specific inputs for tuning visibility
    metaTitle: String
    metaDescription: String
    keywords: String
  }

  extend type Query {
    # Returns all articles. 
    # Logic: Admin sees all; Public users only see published items.
    getArticles(search: String): [Article!]!
    
    # Main lookup for the dynamic article detail page ([slug]/page.tsx)
    getArticleBySlug(slug: String!): Article
    
    # Used primarily by the Admin Dashboard for editing specific records
    getArticleById(id: ID!): Article
  }

  extend type Mutation {
    # Protected: Admin-only creation of articles
    createArticle(input: CreateArticleInput!): Article!
    
    # Protected: Admin-only updates for existing content
    updateArticle(id: ID!, input: UpdateArticleInput!): Article!
    
    # Protected: Permanent removal of an article
    deleteArticle(id: ID!): Article!
    
    # Fast-action Admin tool to instantly publish or hide an article
    toggleArticleStatus(id: ID!, isPublished: Boolean!): Article!
  }
`;