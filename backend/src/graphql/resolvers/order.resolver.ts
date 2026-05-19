import * as queries from "../../db/queries";
import { GraphQLContext } from "../../authorization/context";
import { stripeService } from "../../middleware/services/stripe.service";
import { GraphQLError } from "graphql";
import { ROLES } from "../../config/roles";
import { db } from "../../db";
import { orders, notifications, orderItems } from "../../db/schema";
import { eq } from "drizzle-orm";
import { VALID_ORDER_STATUSES } from "../../config/orderConstants";

/**
 * Calculate total price from cart items including product price × quantity.
 */
const calculateTotal = (items: any[]) => {
  return items.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );
};

export const orderResolvers = {
  Query: {
    /**
     * Return all orders belonging to the currently authenticated user.
     */
    getMyOrders: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      return await queries.getOrdersByUserId(context.userId);
    },

    /**
     * Return all orders in the system — Admin access only.
     */
    getAllOrders: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError("Forbidden: Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      return await queries.getAllOrders();
    },
  },

  Mutation: {
    /**
     * Create a Stripe checkout session and a matching pending order.
     * Flow: validate cart → create DB order → create Stripe session → attach session ID
     */
    createCheckoutSession: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const cartItems = await queries.getCartByUserId(context.userId);
      if (!cartItems || cartItems.length === 0) {
        throw new GraphQLError("Cart is empty", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        // Create the order in DB first so we have an orderId for Stripe metadata
        const newOrder = await queries.createOrder({
          userId: context.userId,
          totalAmount: calculateTotal(cartItems),
          stripeSessionId: "pending",
          items: cartItems,
        });

        const lineItems = cartItems.map((item) => ({
          price_data: {
            currency: "egp",
            product_data: {
              name: item.product.title,
              description: item.product.description,
            },
            unit_amount: Math.round(Number(item.product.price) * 100),
          },
          quantity: item.quantity,
        }));

        const session = await stripeService.createSession(
          lineItems,
          context.userId,
          newOrder.id,
        );

        if (!session.id) {
          throw new GraphQLError("Failed to create Stripe session", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }

        // Attach the real Stripe session ID to the order record
        await queries.updateOrderWithSessionId(newOrder.id, session.id);

        /* MODIFICATION: Removed cart clearing from here.
           Cart must persist until the Webhook confirms successful payment.
        */

        return { url: session.url };
      } catch (error: any) {
        console.error("Checkout Error:", error);
        throw new GraphQLError(error.message || "Failed to process checkout", {
          extensions: {
            code: error.message?.includes("stock")
              ? "BAD_USER_INPUT"
              : "INTERNAL_SERVER_ERROR",
          },
        });
      }
    },

    /**
     * Admin mutation to manually update order status.
     * Also fires delivery notifications when status is set to "delivered".
     */
    updateOrderStatus: async (
      _: unknown,
      { orderId, status }: { orderId: string; status: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      if (context.role !== ROLES.ADMIN) {
        throw new GraphQLError(
          "Forbidden: Only admin can update order status",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      if (!VALID_ORDER_STATUSES.includes(status as any)) {
        throw new GraphQLError(
          `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
          { extensions: { code: "BAD_USER_INPUT" } },
        );
      }

      try {
        const updatedOrder = await queries.updateOrderStatus(
          orderId,
          status as any,
        );

        if (!updatedOrder) {
          throw new GraphQLError(`Order with id ${orderId} not found`, {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Send per-product review notifications when an order is marked delivered
        if (status === "delivered") {
          const orderWithItems = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
            with: {
              items: {
                with: { product: true },
              },
            },
          });

          if (orderWithItems?.items && orderWithItems.items.length > 0) {
            const notificationsToInsert = orderWithItems.items.map((item) => ({
              userId: orderWithItems.userId,
              type: "order_delivered",
              title: "Your order has arrived!",
              message: `Rate your experience with ${item.product.title}`,
              data: JSON.stringify({
                productId: item.product.id,
                productTitle: item.product.title,
                productImage: item.product.imageUrl,
                orderId,
              }),
              isRead: false,
              createdAt: new Date(),
            }));

            await db.insert(notifications).values(notificationsToInsert);
            console.log(
              `Delivery notifications created for user ${orderWithItems.userId}`,
            );
          }
        }

        return updatedOrder;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          error instanceof Error
            ? error.message
            : "Failed to update order status",
          { extensions: { code: "INTERNAL_SERVER_ERROR" } },
        );
      }
    },
  },
};
