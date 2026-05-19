import { gql } from "@apollo/client";

export const GET_PRODUCT_COMMENTS = gql`
  query GetProductComments($productId: ID!) {
    getProductById(id: $productId) {
      comments {
        id
        content
        rating # Here # is correct because it's inside a GraphQL string
        createdAt
        user {
          id
          name
          imageUrl
        }
      }
    }
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      content
      rating 
      createdAt
      user {
        id
        name
        imageUrl
      }
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) { 
    deleteComment(id: $id) {
      id
    }
  }
`;

export interface Comment {
  id: string;
  content: string;
  rating: number; 
  createdAt: string;
  user: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

export interface ProductCommentsResponse {
  getProductById: {
    comments: Comment[];
  };
}

export interface CreateCommentResponse {
  createComment: Comment;
}

export interface DeleteCommentResponse {
  deleteComment: {
    id: string;
  };
}