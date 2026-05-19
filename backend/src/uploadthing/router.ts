import { createUploadthing, type FileRouter } from "uploadthing/express";
import { getAuth } from "@clerk/express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { ROLES } from "../config/roles";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

// Export utapi so it can be used in your GraphQL Resolvers to delete files
export const utapi = new UTApi();

/**
 * Verifies if the user has admin privileges by checking the database.
 */
async function isAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userRole = result?.[0]?.role;

  if (!userRole) return false;

  return userRole.toLowerCase() === ROLES.ADMIN.toLowerCase();
}

/**
 * UploadThing FileRouter configuration.
 */
export const ourFileRouter: FileRouter = {
  // Product image endpoint: 4MB limit, single file
  productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const { userId } = getAuth(req);

      if (!userId) {
        throw new Error("Unauthorized: Please log in.");
      }

      const userIsAdmin = await isAdmin(userId);

      if (!userIsAdmin) {
        throw new Error("Forbidden: Admin access required.");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Logic executed after successful file storage
      // Use ufsUrl if available to comply with future UploadThing versions (v9+)
      return { uploadedBy: metadata.userId, url: file.ufsUrl || file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;