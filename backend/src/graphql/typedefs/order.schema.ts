export const orderItemTypedefs = `#graphql
  """
  Main Order object containing summary details and nested items
  """
  type Order {
    id: ID!
    userId: String!
    totalAmount: Float!
    status: String!
    items: [OrderItem!]!
    createdAt: String
    user: User # Populated via Admin Query (getAllOrders)
    stripeSessionId: String
  }

  """
  Represents a single product within an order
  """
  type OrderItem {
    id: ID!
    product: Product!
    quantity: Int!
    price: Float!
  }

  """
  Response containing the Stripe Checkout URL
  """
  type CheckoutResponse {
    url: String!
  }

  extend type Query {
    # Returns orders for the logged-in user
    getMyOrders: [Order]
    # Admin only: Returns all orders in the system
    getAllOrders: [Order]
  }

  extend type Mutation {
    # Creates a Stripe session and returns the payment URL
    createCheckoutSession: CheckoutResponse!
    # Admin only: Updates order status and triggers delivery notifications
    updateOrderStatus(orderId: ID!, status: String!): Order!
  }
`;