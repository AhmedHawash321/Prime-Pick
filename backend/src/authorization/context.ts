import { verifyToken, getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import { ENV } from "../config/env";
import { db } from "../db";
import { users, products } from "../db/schema"; // Added products to imports
import { eq, inArray } from "drizzle-orm"; // Added inArray for batching
import { ROLES, Role } from "../config/roles";
import DataLoader from "dataloader"; // Import DataLoader library

export interface GraphQLContext {
  userId: string | null;
  role: Role;
  productLoader: DataLoader<string, any>; // Add productLoader to the interface
}

async function syncUserAndGetRole(userId: string): Promise<Role> {
  try {
    // 1. Always check DB first — never trust token for role
    const result = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length > 0 && result[0]) {
      // User exists — return their actual DB role (cast to Role type)
      return result[0].role as Role;
    }

    // 2. User not in DB yet — fetch full profile from Clerk to get real email
    let email = `${userId}@clerk.user`;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      );
      if (primaryEmail) email = primaryEmail.emailAddress;
    } catch {
      // Clerk API unavailable — use fallback email
    }

    // 3. Insert new user with default USER role from config
    await db.insert(users).values({
      id: userId,
      email,
      role: ROLES.USER, // Using ROLES constant
    }).onConflictDoNothing();

    console.log(`New user synced: ${userId} (${email})`);
    return ROLES.USER; // Using ROLES constant

  } catch (error) {
    console.error("Sync User Error:", error);
    return ROLES.USER; // Using ROLES constant
  }
}

export const createContext = async ({ req }: { req: any }): Promise<GraphQLContext> => {
  /**
   * 0. Initialize DataLoader inside the context creation.
   * This ensures the cache is fresh for every single request.
   */
  const productLoader = new DataLoader(async (ids: readonly string[]) => {
    // Batch fetch products using the 'inArray' operator to solve N+1
    const rows = await db
      .select()
      .from(products)
      .where(inArray(products.id, [...ids]));

    // Map results back to the original IDs to maintain order
    return ids.map((id) => rows.find((row) => row.id === id) || null);
  });

  try {
    const authHeader = req.headers["authorization"];
    let userId: string | null = null;

    // 1. Bearer Token auth
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const payload = await verifyToken(token, {
          secretKey: ENV.CLERK_SECRET_KEY!,
        });
        userId = payload.sub as string;
      }
    }

    // 2. Fallback to Clerk session cookie
    if (!userId) {
      const auth = getAuth(req);
      userId = auth?.userId || null;
    }

    if (!userId) {
      return { userId: null, role: ROLES.USER, productLoader }; // Using ROLES constant
    }

    // 3. Get role from DB — this is the single source of truth
    const role = await syncUserAndGetRole(userId);

    return { userId, role, productLoader };

  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Auth Context Error:", error);
    }
    return { userId: null, role: ROLES.USER, productLoader }; // Using ROLES constant
  }
};