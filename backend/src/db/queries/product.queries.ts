import { db } from "../index";
import { eq, and, ilike, gte, lte, desc, SQL, isNull, or } from "drizzle-orm";
import { products, comments, type NewProduct } from "../schema";

// PRODUCT QUERIES
export const createProduct = async (data: NewProduct) => {
  const [product] = await db.insert(products).values(data).returning();
  return product;
};

export const getProducts = async (
  limit: number = 10,
  offset: number = 0,
  filter?: { search?: string; minPrice?: number; maxPrice?: number }
) => {
  const conditions: SQL[] = [isNull(products.deletedAt)];

  if (filter?.search) conditions.push(ilike(products.title, `%${filter.search}%`));
  if (filter?.minPrice !== undefined) conditions.push(gte(products.price, filter.minPrice));
  if (filter?.maxPrice !== undefined) conditions.push(lte(products.price, filter.maxPrice));

  return db.query.products.findMany({
    where: and(...conditions),
    limit,
    offset,
    with: {
      user: true,
      category: true,
      comments: {
        // Filter for approved comments for the general list
        where: eq(comments.status, "approved"),
        with: { user: true },
      },
    },
    orderBy: [desc(products.createdAt)],
  });
};

export const getProductById = async (id: string) => {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, id), isNull(products.deletedAt)),
    with: {
      user: true,
      category: true,
      comments: {
        // Show both approved and pending comments so you can see your recent posts
        where: or(eq(comments.status, "approved"), eq(comments.status, "pending")),
        with: { user: true },
        orderBy: [desc(comments.createdAt)],
      },
    },
  });

  if (!product) return null;

  // Safe access to comments to avoid "Property does not exist" errors
  const productComments = product.comments || [];
  const commentCount = productComments.length;
  const totalRating = productComments.reduce((acc, c) => acc + (c.rating || 0), 0);
  const avgRating = commentCount > 0 ? totalRating / commentCount : 0;

  return {
    ...product,
    commentCount,
    avgRating: parseFloat(avgRating.toFixed(1)),
  };
};

export const getProductsByUserId = async (userId: string) => {
  return db.query.products.findMany({
    where: and(eq(products.userId, userId), isNull(products.deletedAt)),
    with: {
      user: true,
      category: true,
      comments: {
        where: eq(comments.status, "approved"),
      },
    },
    orderBy: (products, { desc }) => [desc(products.createdAt)],
  });
};

export const updateProduct = async (
  id: string,
  userId: string | null,
  isAdmin: boolean,
  data: Partial<NewProduct>
) => {
  const condition = isAdmin
    ? and(eq(products.id, id), isNull(products.deletedAt))
    : and(eq(products.id, id), eq(products.userId, userId!), isNull(products.deletedAt));

  const [product] = await db.update(products).set(data).where(condition).returning();

  if (!product) throw new Error("Product not found or has been soft-deleted");
  return product;
};

export const deleteProduct = async (id: string, userId: string | null, isAdmin: boolean) => {
  const condition = isAdmin
    ? and(eq(products.id, id), isNull(products.deletedAt))
    : and(eq(products.id, id), eq(products.userId, userId!), isNull(products.deletedAt));

  const [product] = await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(condition)
    .returning();

  if (!product) throw new Error("Product not found, already deleted, or unauthorized");
  return product;
};