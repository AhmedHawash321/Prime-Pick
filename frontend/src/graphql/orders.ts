import { gql } from "@apollo/client";

// 1. Query for Get Orders (History) - Regular User
export const GET_MY_ORDERS = gql`
  query GetMyOrders {
    getMyOrders {
      id
      userId
      totalAmount
      status
      createdAt
      items {
        id
        quantity
        price
        product {
          id
          title
          imageUrl
          price
        }
      }
    }
  }
`;

// 2. Query for Get All Orders (Admin only)
export const GET_ALL_ORDERS = gql`
  query GetAllOrders {
    getAllOrders {
      id
      totalAmount
      status
      createdAt
      user {
        id
        name
        email
      }
      items {
        id
        quantity
        price
        product {
          id
          title
          imageUrl
          price
        }
      }
    }
  }
`;

// 3. Mutation for Stripe Checkout
export const CREATE_CHECKOUT_SESSION = gql`
  mutation CreateCheckoutSession {
    createCheckoutSession {
      url
    }
  }
`;

// 4. Mutation for Admin - Update Order Status
export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: ID!, $status: String!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      id
      status
      totalAmount
      createdAt
    }
  }
`;

// Response Types
export interface CheckoutResponse {
  createCheckoutSession: {
    url: string;
  };
}

export interface UpdateOrderStatusResponse {
  updateOrderStatus: {
    id: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  };
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    title: string;
    imageUrl: string;
    price: number;
  };
}

export interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface OrdersResponse {
  getMyOrders: Order[];
}

export interface AllOrdersResponse {
  getAllOrders: Order[];
}