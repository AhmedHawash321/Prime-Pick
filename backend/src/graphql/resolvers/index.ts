import { productResolvers } from "./product.resolver";
import { userResolvers } from "./user.resolver";
import { commentResolvers } from "./comment.resolver";
import { cartResolvers } from "./cart.resolver";
import { orderResolvers } from "./order.resolver";
import { categoryResolvers } from "./category.resolver";
import { articleResolvers } from "./article.resolver";
import { notificationResolvers } from "./notification.resolver";

export const mergedResolvers = {
  Query: {
    ...productResolvers.Query,
    ...userResolvers.Query,
    ...commentResolvers.Query,
    ...cartResolvers.Query,
    ...orderResolvers.Query,
    ...categoryResolvers.Query,
    ...articleResolvers.Query,
    ...notificationResolvers.Query,
  },
  Mutation: {
    ...productResolvers.Mutation,
    ...userResolvers.Mutation,
    ...commentResolvers.Mutation,
    ...cartResolvers.Mutation,
    ...orderResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...articleResolvers.Mutation,
    ...notificationResolvers.Mutation,
  },
};