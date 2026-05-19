import { createInsertSchema } from "drizzle-zod";
import { products, users, comments, cartItems, categories, articles, notifications } from "./schema";
import { z } from "zod";

// --- 1. Categories Validation ---
export const insertCategorySchema = createInsertSchema(categories, {
  id: (s) => s.optional(),
  name: (s) => s.min(2, "Category name must be at least 2 chars"),
  slug: (s) =>
    s
      .min(2, "Slug is required")
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and contain only hyphens"),
  description: (s) => s.min(10, "Description should be at least 10 characters").optional(),
  imageUrl: (s) => s.url("Invalid category image URL").optional(),
});

export const updateCategorySchema = insertCategorySchema.partial();

// --- 2. Products Validation ---
export const insertProductSchema = createInsertSchema(products, {
  id: (s) => s.optional(),
  userId: (s) => s.optional(),
  categoryId: () =>
    z.string().uuid("Invalid Category ID format").nullable().optional(),
  title: (s) => s.min(3, "Title must be at least 3 chars"),
  price: () => z.coerce.number().gt(0, "Price must be greater than zero"),
  stock: () => z.coerce.number().int().nonnegative("Stock cannot be negative"),
  imageUrl: (s) => s.url("Invalid image URL").min(1, "Product image is required"),
  description: (s) => s.min(10, "Description should be more descriptive"),
  deletedAt: () => z.date().transform(() => undefined).optional(),
});

export const updateProductSchema = insertProductSchema.partial();

// --- 3. Users Validation ---
export const insertUserSchema = createInsertSchema(users, {
  id: (s) => s.min(1, "User ID from Clerk is required"),
  email: (s) => s.email("Invalid email address"),
  name: (s) => s.min(2, "Name is too short").optional(),
  imageUrl: (s) => s.url("Invalid profile image URL").optional(),
  role: (s) => s.default("user").optional(),
});

export const updateUserSchema = insertUserSchema.partial();

// --- 4. Comments Validation ---
// Ensures review content and ratings follow strict business rules
export const insertCommentSchema = createInsertSchema(comments, {
  content: (s) =>
    s.min(1, "Review cannot be empty").max(500, "Review is too long"),
  userId: (s) => s.min(1, "User ID is required"),
  productId: () => z.string().uuid("Invalid Product ID format"),
  rating: () =>
    z.coerce.number()
      .int()
      .min(1, "Rating must be at least 1 star")
      .max(5, "Rating cannot exceed 5 stars")
      .default(5),
});

export const updateCommentSchema = insertCommentSchema.partial();

// --- 5. Cart Items Validation ---
export const insertCartItemSchema = createInsertSchema(cartItems, {
  quantity: () => z.number().int().positive("Quantity must be at least 1"),
  productId: () => z.string().uuid("Invalid Product ID"),
  userId: () => z.string().min(1, "User ID is required"),
});

export const updateCartItemSchema = insertCartItemSchema.partial();

// --- 6. Articles Validation ---
export const insertArticleSchema = createInsertSchema(articles, {
  id: (s) => s.optional(),
  title: (s) => s.min(5, "Title must be at least 5 characters"),
  slug: (s) =>
    s
      .min(2, "Slug is required")
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and contain only hyphens"),
  summary: (s) => s.min(10, "Summary must be at least 10 characters").max(400, "Summary cannot exceed 400 characters").optional(),
  readTime: () => z.coerce.number().int().positive("Read time must be a positive number").optional().default(1),
  content: (s) => s.min(20, "Article content must be at least 20 characters"),
  imageUrl: (s) => s.url("Invalid image URL").optional(),
  authorId: (s) => s.min(1, "Author ID is required"),
  isPublished: (s) => s.default(false),
  metaTitle: (s) => s.max(60, "Meta title should be under 60 chars").optional(),
  metaDescription: (s) => s.max(160, "Meta description should be under 160 chars").optional(),
  keywords: (s) => s.optional(),
});

export const updateArticleSchema = insertArticleSchema.partial();

// --- 7. Notifications Validation  ---
// Validates notification data ensuring it can handle the stringified JSON 
// containing order and product information.
export const insertNotificationSchema = createInsertSchema(notifications, {
  id: (s) => s.optional(),
  userId: (s) => s.min(1, "User ID is required"),
  type: (s) => s.min(3, "Notification type is required"), // e.g., "order_delivered"
  title: (s) => s.min(3, "Title is required").max(100, "Title is too long"),
  message: (s) => s.min(5, "Message is required").max(500, "Message is too long"),
  // Data field is kept optional but must be a string if provided (for JSON storage)
  data: (s) => s.optional(), 
  isRead: (s) => s.default(false).optional(),
  createdAt: (s) => s.optional(),
});

export const updateNotificationSchema = insertNotificationSchema.partial();

// --- 8. Export Types ---
export type NewCategoryInput = z.infer<typeof insertCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export type NewProductInput = z.infer<typeof insertProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export type NewUserInput = z.infer<typeof insertUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type NewCommentInput = z.infer<typeof insertCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export type NewCartItemInput = z.infer<typeof insertCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export type NewArticleInput = z.infer<typeof insertArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export type NewNotificationInput = z.infer<typeof insertNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;