import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { orders, orderItems, products } from "../schema";
import { VALID_ORDER_STATUSES } from "../../config/orderConstants";

/**
 * Create a new order using a Database Transaction.
 * Checks stock, deducts inventory, and creates order + items atomically.
 * Initial status is "pending" until Stripe payment is confirmed via webhook.
 */
export const createOrder = async (data: {
  userId: string;
  totalAmount: number;
  stripeSessionId: string;
  items: any[];
}) => {
  return await db.transaction(async (tx) => {
    // 1. Validate and deduct stock for each cart item
    for (const item of data.items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId));

      if (!product || product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for product: ${product?.title || item.productId}`,
        );
      }

      await tx
        .update(products)
        .set({ stock: product.stock - item.quantity })
        .where(eq(products.id, item.productId));
    }

    // 2. Insert the main order record with "pending" status
    // Status will be updated to "processing" by the Stripe webhook after payment
    const [newOrder] = await tx
      .insert(orders)
      .values({
        userId: data.userId,
        totalAmount: data.totalAmount,
        stripeSessionId: data.stripeSessionId,
        status: "pending",
      })
      .returning();

    if (!newOrder) throw new Error("Failed to create order header");

    // 3. Insert all order items linked to the new order
    const itemsToInsert = data.items.map((item) => ({
      orderId: newOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.product.price,
    }));

    await tx.insert(orderItems).values(itemsToInsert);

    return newOrder;
  });
};

/**
 * Fetch all orders for a specific user, newest first.
 */
export const getOrdersByUserId = async (userId: string) => {
  return db.query.orders.findMany({
    where: (fields) => eq(fields.userId, userId),
    with: {
      items: {
        with: { product: true },
      },
    },
    orderBy: [desc(orders.createdAt)],
  });
};

/**
 * Fetch all orders in the system — Admin only, newest first.
 */
export const getAllOrders = async () => {
  return db.query.orders.findMany({
    with: {
      items: {
        with: { product: true },
      },
      user: true,
    },
    orderBy: [desc(orders.createdAt)],
  });
};

/**
 * Attach the real Stripe session ID to an order after session creation.
 * Called immediately after stripeService.createSession() succeeds.
 */
export const updateOrderWithSessionId = async (
  orderId: string,
  sessionId: string,
) => {
  const [updatedOrder] = await db
    .update(orders)
    .set({ stripeSessionId: sessionId })
    .where(eq(orders.id, orderId))
    .returning();

  return updatedOrder;
};

/**
 * Update the status of an order.
 * Validates against the centralized VALID_ORDER_STATUSES list.
 * Used by both the Stripe webhook (auto) and Admin dashboard (manual).
 */
export const updateOrderStatus = async (orderId: string, status: string) => {
  if (!VALID_ORDER_STATUSES.includes(status as any)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
    );
  }

  const [updatedOrder] = await db
    .update(orders)
    .set({ status })
    .where(eq(orders.id, orderId))
    .returning();

  if (!updatedOrder) throw new Error(`Order with id ${orderId} not found`);

  return updatedOrder;
};