import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  integer,
  unique,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Users Table Definition ---
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  imageUrl: text("image_url"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// --- Categories Table Definition ---
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// --- Products Table Definition ---
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    price: numeric("price", { precision: 10, scale: 2 })
      .notNull()
      .$type<number>(),
    imageUrl: text("image_url").notNull(),
    description: text("description").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    stock: integer("stock").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => ({
    titleIdx: index("title_idx").on(t.title),
    priceIdx: index("price_idx").on(t.price),
    userProductIdx: index("user_product_idx").on(t.userId),
    categoryProductIdx: index("category_product_idx").on(t.categoryId),
    activeProductsIdx: index("active_products_idx").on(t.deletedAt),
  }),
);

// --- Notifications Table Definition ---
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("notifications_user_id_idx").on(t.userId),
  isReadIdx: index("notifications_is_read_idx").on(t.isRead),
  typeIdx: index("notifications_type_idx").on(t.type),
  createdAtIdx: index("notifications_created_at_idx").on(t.createdAt),
}));

// --- Articles Table Definition ---
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    summary: text("summary"),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    readTime: integer("read_time").default(1),
    isPublished: boolean("is_published").default(false).notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    keywords: text("keywords"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    slugIdx: index("slug_idx").on(t.slug),
    publishedIdx: index("published_idx").on(t.isPublished),
    authorIdx: index("author_idx").on(t.authorId),
  })
);

// --- Comments Table Definition (Updated with Moderation Fields) ---
export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  rating: integer("rating").default(5),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),

  // Status for moderation: "approved", "pending", or "rejected"
  status: text("status").notNull().default("approved"),

  // Stores the reason for moderation (e.g., AI flagging reason)
  moderationReason: text("moderation_reason"),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// --- Shopping Cart Items Table ---
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    unq: unique().on(table.userId, table.productId),
  }),
);

// --- Orders Table Definition ---
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 })
    .notNull()
    .$type<number>(),
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Order Items Table ---
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 })
    .notNull()
    .$type<number>(),
});

// --- Drizzle Relations ---

export const userRelations = relations(users, ({ many }) => ({
  products: many(products),
  comments: many(comments),
  orders: many(orders),
  articles: many(articles),
  notifications: many(notifications),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  comments: many(comments),
  user: one(users, { fields: [products.userId], references: [users.id] }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  author: one(users, { fields: [articles.authorId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  product: one(products, {
    fields: [comments.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// --- TypeScript Type Exports ---
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;