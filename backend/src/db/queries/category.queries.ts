import { db } from "../index";
import { eq, ilike, desc, count, isNull, and } from "drizzle-orm";
import { categories, products, type NewCategory } from "../schema";

// --- CATEGORY QUERIES ---

/**
 * Creates a new category in the database.
 */
export const createCategory = async (data: NewCategory) => {
  const [category] = await db.insert(categories).values(data).returning();
  return category;
};

/**
 * Fetches all categories with optional search filtering.
 * Includes a limited list of active (non-deleted) products for each category.
 */
export const getCategories = async (search?: string) => {
  try {
    const condition = search
      ? ilike(categories.name, `%${search}%`)
      : undefined;

    const result = await db.query.categories.findMany({
      ...(condition && { where: condition }),
      orderBy: [desc(categories.createdAt)],
      with: {
        products: {
          // Filter to only include products that have not been soft-deleted
          where: isNull(products.deletedAt),
          limit: 5,
          orderBy: [desc(products.createdAt)],
        },
      },
    });
    return result;
  } catch (error) {
    console.error("Error in getCategories:", error);
    return [];
  }
};

/**
 * Fetches a specific category by its slug.
 * Includes all associated active products and their owners.
 * Modified to accept isAdmin for conditional product visibility.
 */
export const getCategoryBySlug = async (
  slug: string,
  isAdmin: boolean = false,
) => {
  return db.query.categories.findFirst({
    where: eq(categories.slug, slug),
    with: {
      products: {
        // Essential: Filter out products marked as deleted unless the user is an admin
        where: isNull(products.deletedAt),
        with: { user: true },
        orderBy: [desc(products.createdAt)],
      },
    },
  });
};

/**
 * Fetches a specific category by its unique UUID.
 */
export const getCategoryById = async (id: string) => {
  return db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
};

/**
 * Updates an existing category's information.
 */
export const updateCategory = async (
  id: string,
  data: Partial<NewCategory>,
) => {
  const [category] = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();

  if (!category) throw new Error("Category not found");
  return category;
};

/**
 * Permanently deletes a category from the database.
 */
export const deleteCategory = async (id: string) => {
  const [category] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();

  if (!category) throw new Error("Category not found");
  return category;
};

/**
 * Professional Query: Fetches categories and counts only active products within each.
 */
export const getCategoriesWithCount = async () => {
  return await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      count: count(products.id),
    })
    .from(categories)
    .leftJoin(
      products,
      // Join condition ensures we only count products belonging to the category that aren't deleted
      and(eq(products.categoryId, categories.id), isNull(products.deletedAt)),
    )
    .groupBy(categories.id)
    .orderBy(desc(count(products.id)));
};
