import { gql } from "@apollo/client";

// 1. Query for Get Products (Pagination & Filter)
export const GET_PRODUCTS = gql`
  query GetProducts($limit: Int, $offset: Int, $filter: ProductFilterInput) {
    getProducts(limit: $limit, offset: $offset, filter: $filter) {
      id
      title
      description
      price
      stock
      imageUrl
      createdAt
      user {
        id
        name
      }
      # Added category for filtering/displaying in grid if needed
      category {
        id
        name
        slug
      }
    }
  }
`;

// 2. Query for Get Single Product
// Updated to include detailed comment fields to fix the missing reviews issue
export const GET_PRODUCT_BY_ID = gql`
  query GetProductById($id: ID!) {
    getProductById(id: $id) {
      id
      title
      description
      price
      stock
      imageUrl
      userId
      categoryId
      createdAt
      # Crucial for the "Back to Category" button
      category {
        id
        name
        slug
      }
      user {
        id
        name
      }
      # Expanded comments selection to include content, date, and reviewer name
      comments {
        id
        content
        rating
        createdAt
        user {
          name
        }
      }
    }
  }
`;

// 3. Query for Get My Products
export const GET_MY_PRODUCTS = gql`
  query GetMyProducts($userId: ID!) {
    getProductsByUserId(userId: $userId) {
      id
      title
      description
      imageUrl
      price
      stock
      createdAt
      user {
        id
        name
      }
    }
  }
`;

// 4. Mutation for Create product
export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      title
      price
      stock
      imageUrl
      createdAt
    }
  }
`;

// 5. Mutation for Update
export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      title
      price
      stock
      imageUrl
      categoryId
    }
  }
`;

// 6. Mutation for Delete
export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id) {
      id
    }
  }
`;