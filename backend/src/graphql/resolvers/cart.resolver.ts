import { GraphQLError } from "graphql";
import * as queries from "../../db/queries";
import { insertCartItemSchema } from "../../db/validation";
import { GraphQLContext } from "../../authorization/context";
import { db } from "../../db";
import { cartItems, products } from "../../db/schema";
import { eq } from "drizzle-orm";

// 1. Define the TypeScript interface representing the database schema product object.
interface ProductType {
  id: string;
  name: string;
  price: number;
  stock: number;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the exact shape of the parent object passed to the CartItem field resolvers.
interface CartItemParent {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product?: ProductType; // Populated if side-loaded via Drizzle 'with'
}

export const cartResolvers = {
  CartItem: {
    /**
     * Resolver for the 'product' field on a CartItem.
     * This implementation avoids the N+1 problem by checking if the
     * product data was already side-loaded by the parent query via Drizzle 'with'.
     */
    product: async (parent: CartItemParent, _: unknown, context: GraphQLContext) => {
      // If the product was already fetched in the parent query (Batching/Joins), return it immediately.
      if (parent.product) return parent.product;

      // Fallback: If not pre-fetched, perform a targeted select.
      return context.productLoader.load(parent.productId);
    },
  },

  Query: {
    /**
     * Retrieves the cart for a specific user ID.
     * Includes authorization check to ensure users can only see their own carts.
     */
    getCartByUserId: async (
      _: unknown,
      { userId }: { userId: string },
      context: GraphQLContext,
    ) => {
      // Verify that the requested cart belongs to the authenticated user.
      if (!context.userId || context.userId !== userId) {
        throw new GraphQLError("Unauthorized access to this cart", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      try {
        const cartItems = await queries.getCartByUserId(userId);
        return cartItems;
      } catch (error) {
        console.error("Get Cart Error:", error);
        throw new GraphQLError("Failed to fetch cart items");
      }
    },
  },

  Mutation: {
    /**
     * Adds a product to the user's cart.
     * Performs input validation and stock availability checks via the query layer.
     */
    addToCart: async (
      _: unknown,
      { input }: { input: { productId: string; quantity: number } },
      context: GraphQLContext,
    ) => {
      // Ensure user is authenticated.
      if (!context.userId) {
        throw new GraphQLError("You must be logged in to add items to cart", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const fullInput = { ...input, userId: context.userId };
      const validation = insertCartItemSchema.safeParse(fullInput);

      // Validate input using Zod schema.
      if (!validation.success) {
        throw new GraphQLError("Invalid input data", {
          extensions: {
            code: "BAD_USER_INPUT",
            errors: validation.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const newItem = await queries.addToCart(validation.data);
        return newItem;
      } catch (error: any) {
        console.error("Add to Cart Error:", error);
        throw new GraphQLError(error.message || "Failed to add item to cart");
      }
    },

    /**
     * Removes a specific item from the cart.
     * Checks ownership of the cart item before deletion.
     */
    removeFromCart: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId)
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const [item] = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, id));

      if (!item) throw new Error("Cart item not found");

      // Verify ownership.
      if (item.userId !== context.userId) {
        throw new Error("Forbidden: You don't own this cart item");
      }
      try {
        const deletedItem = await queries.removeFromCart(id);
        return deletedItem;
      } catch (error: any) {
        throw new GraphQLError(error.message || "Failed to remove item");
      }
    },

    /**
     * Updates the quantity of an item in the cart.
     * Checks current stock to ensure requested quantity is available.
     */
    updateCartItem: async (
      _: unknown,
      { id, quantity }: { id: string; quantity: number },
      context: GraphQLContext,
    ) => {
      if (!context.userId) throw new GraphQLError("Unauthenticated");

      // 1. Fetch item and its product relation to check stock.
      const itemWithProduct = await db.query.cartItems.findFirst({
        where: eq(cartItems.id, id),
        with: { product: true },
      });

      if (!itemWithProduct) throw new GraphQLError("Cart item not found");
      if (itemWithProduct.userId !== context.userId)
        throw new GraphQLError("Forbidden");

      // 2. Validate requested quantity against product stock.
      if (quantity > itemWithProduct.product.stock) {
        throw new GraphQLError(
          `Only ${itemWithProduct.product.stock} items available`,
        );
      }

      const [updated] = await db
        .update(cartItems)
        .set({ quantity })
        .where(eq(cartItems.id, id))
        .returning();

      return updated;
    },
    /**
     * Removes all items from the authenticated user's cart.
     */
    clearCart: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId)
        throw new GraphQLError("Unauthenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      try {
        const clearedItems = await queries.clearCart(context.userId);
        return clearedItems;
      } catch (error: any) {
        throw new GraphQLError(error.message || "Failed to clear cart");
      }
    },
  },
};