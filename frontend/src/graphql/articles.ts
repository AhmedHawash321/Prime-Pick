import { gql } from "@apollo/client";

// --- QUERIES ---

/**
 * Fetch all articles (Admin sees all, Public sees published only)
 * Includes core preview data and author relations.
 */
export const GET_ARTICLES = gql`
  query GetArticles($search: String) {
    getArticles(search: $search) {
      id
      title
      slug
      summary
      readTime
      imageUrl
      isPublished
      createdAt
      author {
        name
        imageUrl
      }
    }
  }
`;

/**
 * Fetch a specific article by ID (For Edit Form in Dashboard)
 * Includes all SEO metadata and raw content for the editor.
 */
export const GET_ARTICLE_BY_ID = gql`
  query GetArticleById($id: ID!) {
    getArticleById(id: $id) {
      id
      title
      slug
      summary
      content
      readTime
      imageUrl
      isPublished
      metaTitle
      metaDescription
      keywords
      authorId
    }
  }
`;

/**
 * Fetch article by Slug (For Public Blog View)
 * Optimized for SEO and rich content display.
 */
export const GET_ARTICLE_BY_SLUG = gql`
  query GetArticleBySlug($slug: String!) {
    getArticleBySlug(slug: $slug) {
      id
      title
      content
      summary
      readTime
      imageUrl
      metaTitle
      metaDescription
      keywords
      createdAt
      author {
        name
        imageUrl
      }
    }
  }
`;

// --- MUTATIONS ---

/**
 * Create a new article
 * Returns basic info to confirm success and redirect if necessary.
 */
export const CREATE_ARTICLE = gql`
  mutation CreateArticle($input: CreateArticleInput!) {
    createArticle(input: $input) {
      id
      title
      slug
    }
  }
`;

/**
 * Update existing article content or SEO metadata
 */
export const UPDATE_ARTICLE = gql`
  mutation UpdateArticle($id: ID!, $input: UpdateArticleInput!) {
    updateArticle(id: $id, input: $input) {
      id
      title
      slug
    }
  }
`;

/**
 * Delete an article permanently
 */
export const DELETE_ARTICLE = gql`
  mutation DeleteArticle($id: ID!) {
    deleteArticle(id: $id) {
      id
      title
    }
  }
`;

/**
 * Toggle Publish Status (Quick toggle from Dashboard)
 * Allows for instant publication or archiving.
 */
export const TOGGLE_ARTICLE_STATUS = gql`
  mutation ToggleArticleStatus($id: ID!, $isPublished: Boolean!) {
    toggleArticleStatus(id: $id, isPublished: $isPublished) {
      id
      isPublished
    }
  }
`;