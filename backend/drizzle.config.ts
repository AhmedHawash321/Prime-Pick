import { defineConfig } from "drizzle-kit";
import { ENV } from "./src/config/env";

/**
 * Drizzle Kit Configuration File
 * This file configures how Drizzle Kit interacts with your database for migrations, 
 * pushing schema changes, and introspection.
 * Documentation: https://orm.drizzle.team/docs/get-started-postgresql
 */
export default defineConfig({
  /**
   * Database dialect: 'postgresql' is used for Neon/Postgres databases.
   * This is required in drizzle-kit version 0.21.0 and above.
   */
  dialect: "postgresql",

  /**
   * Path to your schema definition file(s). 
   * This is where you define your tables, relations, and enums using Drizzle ORM.
   */
  schema: "./src/db/schema.ts",

  /**
   * Directory where generated SQL migration files and snapshots will be stored.
   */
  out: "./drizzle",

  /**
   * Database connection credentials.
   * Using the connection URL is the recommended way for Neon serverless databases.
   */
  dbCredentials: {
    url: ENV.DB_URL!,
  },

  /**
   * Safety and Feedback Settings:
   * 'strict': Prompts for confirmation before executing potentially destructive SQL.
   * 'verbose': Prints all executed SQL statements to the terminal for debugging.
   */
  strict: true,
  verbose: true,

  /**
   * Breakpoints:
   * Essential for databases that do not support multiple DDL statements in one transaction.
   * For PostgreSQL, this ensures safe execution of complex schema changes.
   */
  breakpoints: true,
});