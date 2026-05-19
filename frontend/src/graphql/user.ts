import { gql } from "@apollo/client";

// 1. Query Get User By ID
export const GET_USER_BY_ID = gql`
  query GetUserById($id: String!) {
    getUserById(id: $id) {
      id
      email
      name
      imageUrl
      role
      createdAt
      updatedAt
    }
  }
`;

// 2. Mutation for Sync User
export const SYNC_USER = gql`
  mutation SyncUser($input: UpsertUserInput!) {
    syncUser(input: $input) {
      id
      email
      name
      imageUrl
      role
    }
  }
`;

// 3. Mutation for Updating User
export const UPDATE_USER = gql`
  mutation UpdateUser($id: String!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      imageUrl
      role
      updatedAt
    }
  }
`;

// 4. Query for getting current user's role (new)
export const GET_MY_ROLE = gql`
  query GetMyRole {
    getMyRole
  }
`;

// 5. Admin only: Update user role
export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($userId: String!, $role: String!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      email
      name
      role
    }
  }
`;

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserInput {
  name?: string;
  imageUrl?: string;
  role?: string;
}

export interface UpsertUserInput {
  id: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role?: string;
}