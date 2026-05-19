import { db } from "../index";
import { eq, sql, and } from "drizzle-orm";
import { cartItems, products, type NewCartItem } from "../schema";

// CART QUERIES

export const getCartByUserId = async (userId: string) => {
  return db.query.cartItems.findMany({
    where: eq(cartItems.userId, userId),
    with: { product: true },
  });
};

export const addToCart = async (data: NewCartItem) => {
  // 1. make sure quantity exist , convert it into INT , make sure return is not undefined
  const requestedQuantity = data.quantity ?? 1;

  // 2. Fetch current stock and existing cart quantity
  const product = await db.query.products.findFirst({
    where: eq(products.id, data.productId),
  });

  if (!product) throw new Error("Product not found");

  const existingItem = await db.query.cartItems.findFirst({
    where: and(
      eq(cartItems.userId, data.userId),
      eq(cartItems.productId, data.productId)
    ),
  });

  const currentCartQty = existingItem?.quantity || 0;
  const newTotalQty = currentCartQty + requestedQuantity;

  // 3. Stock Validation
  if (newTotalQty > product.stock) {
    throw new Error(`Only ${product.stock} items available in stock`);
  }

  // 4. Perform the upsert
  const [insertedItem] = await db
    .insert(cartItems)
    .values({
      ...data,
      quantity: requestedQuantity // pass value
    })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: {
        quantity: sql`${cartItems.quantity} + ${requestedQuantity}`,
      },
    })
    .returning();

  if (!insertedItem) {
    throw new Error("Failed to add item to cart");
  }

  // 5. Fetch the complete item with product relation
  const fullItem = await db.query.cartItems.findFirst({
    where: eq(cartItems.id, insertedItem.id),
    with: { product: true },
  });

  if (!fullItem) {
    throw new Error("Failed to retrieve cart item after insertion");
  }

  return fullItem;
};

export const removeFromCart = async (id: string) => {
  const [item] = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
  if (!item) throw new Error(`Cart item with id ${id} not found`);
  return item;
};

export const clearCart = async (userId: string) => {
  return db.delete(cartItems).where(eq(cartItems.userId, userId)).returning();
};