import { db } from "../index";
import { eq, and, or } from "drizzle-orm";
import { comments, type NewComment } from "../schema";

export const createComment = async (data: NewComment) => {
  const [comment] = await db.insert(comments).values(data).returning();
  return comment;
};

export const deleteComment = async (id: string) => {
  const [comment] = await db
    .delete(comments)
    .where(eq(comments.id, id))
    .returning();
  if (!comment) throw new Error(`Comment with id ${id} not found`);
  return comment;
};

// ✅ الـ fix — لازم يفلتر بالـ id وبالـ status مع بعض
export const getCommentById = async (id: string) => {
  return db.query.comments.findFirst({
    where: and(
      eq(comments.id, id),
      or(eq(comments.status, "approved"), eq(comments.status, "pending")),
    ),
    with: { user: true },
  });
};