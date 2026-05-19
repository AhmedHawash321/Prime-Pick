import { db } from "../index";
import { eq, and, ilike, desc, SQL } from "drizzle-orm";
import { articles, type NewArticle } from "../schema";

// --- ARTICLE QUERIES ---

/**
 * Creates a new article in the database.
 * The data is validated by insertArticleSchema in the resolver before this is called.
 */
export const createArticle = async (data: NewArticle) => {
  const [article] = await db.insert(articles).values(data).returning();
  return article;
};

/**
 * Fetches all articles with optional filters.
 * Includes author relation for front-end display.
 * @param isAdmin - If true, fetches all articles (Drafts & Published). If false, fetches only published ones.
 * @param search - Optional search term for titles.
 */
export const getArticles = async (isAdmin: boolean = false, search?: string) => {
  try {
    const conditions: SQL[] = [];

    // Public view only sees published content
    if (!isAdmin) {
      conditions.push(eq(articles.isPublished, true));
    }

    // Search filter for titles (case-insensitive)
    if (search) {
      conditions.push(ilike(articles.title, `%${search}%`));
    }

    return await db.query.articles.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [desc(articles.createdAt)],
    });
  } catch (error) {
    console.error("Error in getArticles:", error);
    return [];
  }
};

/**
 * Fetches a single article by its slug for the public blog view or admin preview.
 * Uses top-level condition building to avoid Drizzle SQLWrapper type conflicts.
 * @param slug - The unique string identifier for the article URL.
 * @param isAdmin - If true, bypasses the "isPublished" check to allow admin previews.
 */
export const getArticleBySlug = async (slug: string, isAdmin: boolean = false) => {
  // Build condition based on role
  const condition = isAdmin 
    ? eq(articles.slug, slug) 
    : and(eq(articles.slug, slug), eq(articles.isPublished, true));

  return await db.query.articles.findFirst({
    where: condition,
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });
};

/**
 * Fetches a specific article by its UUID (Primarily for Admin/Editor use).
 */
export const getArticleById = async (id: string) => {
  return await db.query.articles.findFirst({
    where: eq(articles.id, id),
    with: {
      author: true,
    },
  });
};

/**
 * Updates an existing article's content or metadata.
 * Ensures the updatedAt timestamp is refreshed.
 */
export const updateArticle = async (id: string, data: Partial<NewArticle>) => {
  const [article] = await db
    .update(articles)
    .set({
      ...data,
      updatedAt: new Date(), 
    })
    .where(eq(articles.id, id))
    .returning();

  if (!article) throw new Error("Article not found");
  return article;
};

/**
 * Permanently deletes an article from the database.
 */
export const deleteArticle = async (id: string) => {
  const [article] = await db
    .delete(articles)
    .where(eq(articles.id, id))
    .returning();

  if (!article) throw new Error("Article not found");
  return article;
};

/**
 * Toggles the publication status of an article.
 * Useful for quickly publishing/unpublishing via the admin dashboard.
 */
export const toggleArticleStatus = async (id: string, isPublished: boolean) => {
  const [article] = await db
    .update(articles)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning();

  if (!article) throw new Error("Article not found");
  return article;
};