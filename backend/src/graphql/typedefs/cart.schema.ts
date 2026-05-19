export const cartItemsTypeDefs = `#graphql
type CartItem {
id: ID!
userId: String!
productId: ID!
quantity: Int!
product: Product!
createdAt: String
}

input AddToCartInput {
  productId: ID!
  quantity: Int!
}

extend type Query {
getCartByUserId(userId: String!): [CartItem]
}

extend type Mutation {
addToCart(input: AddToCartInput!): CartItem
updateCartItem(id: ID!, quantity: Int!): CartItem
removeFromCart(id: ID!): CartItem
clearCart: [CartItem]
}
`