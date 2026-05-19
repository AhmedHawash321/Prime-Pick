import { db } from "../index";
import { eq } from "drizzle-orm";
import { users, type NewUser } from "../schema";

// USER QUERIES
export const createUser = async (data: NewUser) => {
  const [user] = await db.insert(users).values(data).returning();
  return user;
};

export const getUserById = async (id: string) => {
  return db.query.users.findFirst({ where: eq(users.id, id) });
};

export const updateUser = async (id: string, data: Partial<NewUser>) => {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  if (!user) {
    throw new Error(`User with id ${id} not found`);
  }
  return user;
};

// Upsert - create or update
export const upsertUser = async (data: NewUser) => {
  const { id, ...updateData } = data;
  const [user] = await db
    .insert(users)
    .values(data)
    .onConflictDoUpdate({
      target: users.id,
      set: updateData,
    })
    .returning();
  return user;
};