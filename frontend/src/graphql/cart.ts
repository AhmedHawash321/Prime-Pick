import { gql } from "@apollo/client";

export interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    imageUrl: string;
    description: string;
    stock: number;
  };
}

export interface CartResponse {
  getCartByUserId: CartItem[];
}

export interface AddToCartResponse {
  addToCart: {
    id: string;
    quantity: number;
    product: {
      id: string;
      title: string;
      price: number;
      imageUrl: string;
      stock: number;
    };
  };
}

export interface UpdateCartItemResponse {
  updateCartItem: {
    id: string;
    quantity: number;
  };
}

export interface RemoveFromCartResponse {
  removeFromCart: {
    id: string;
  };
}

export interface ClearCartResponse {
  clearCart: Array<{ id: string }>;
}

export interface AddToCartInput {
  productId: string;
  quantity: number;
}

// Queries & Mutations
export const GET_CART = gql`
  query GetCart($userId: String!) {
    getCartByUserId(userId: $userId) {
      id
      quantity
      product {
        id
        title
        price
        imageUrl
        description
        stock
      }
    }
  }
`;

export const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      id
      quantity
      product {
        id
        title
        price
        imageUrl
        stock
      }
    }
  }
`;

export const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($id: ID!, $quantity: Int!) {
    updateCartItem(id: $id, quantity: $quantity) {
      id
      quantity
    }
  }
`;

export const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($id: ID!) {
    removeFromCart(id: $id) {
      id
    }
  }
`;

export const CLEAR_CART = gql`
  mutation ClearCart {
    clearCart {
      id
    }
  }
`;