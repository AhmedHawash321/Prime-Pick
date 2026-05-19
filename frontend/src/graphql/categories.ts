import { gql } from "@apollo/client";

// 1. Gat All Categories
export const GET_CATEGORIES = gql`
  query GetCategories($search: String) {
    getCategories(search: $search) {
      id
      name
      slug
      imageUrl
      createdAt
    }
  }
`;

// 2. Get 1 catogory By Slug
export const GET_CATEGORY_BY_SLUG = gql`
  query GetCategoryBySlug($slug: String!) {
    getCategoryBySlug(slug: $slug) {
      id
      name
      slug
      imageUrl
      products {
        id
        title
        price
        imageUrl
        stock
      }
    }
  }
`;

// 3. Filtering
export const GET_CATEGORIES_COUNT = gql`
  query GetCategoriesCount {
    getCategoriesCount {
      id
      name
      count
    }
  }
`;

// 4. Create Mutation (Admin Only)
export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      slug
    }
  }
`;

// 5. Update Mutation
export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      name
      slug
      imageUrl
    }
  }
`;

// 6. Delete Mutation 
export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id) {
      id
      name
    }
  }
`;