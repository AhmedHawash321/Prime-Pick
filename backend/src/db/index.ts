import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { ENV } from "../config/env";
import { sql } from "drizzle-orm";

if (!ENV.DB_URL) {
    throw new Error("DB_URL is not working");
}

const pool = new Pool({ 
    connectionString: ENV.DB_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Ensure SSL is handled correctly for Neon connections
    ssl: {
        rejectUnauthorized: false,
    },
});

// --- Critical Error Listener ---
// This prevents the entire Node.js process from crashing if a database connection 
// is lost unexpectedly while the client is idle in the pool.
pool.on("error", (err) => {
    console.error("Unexpected error on idle database client:", err);
});

console.log("Database Pool Initialized");

export const db = drizzle(pool, { schema });

// --- Keep Neon DB Awake ---
// Ping the database every 5 minutes (300,000 ms) to prevent sleep mode
setInterval(async () => {
    try {
        // Use a lightweight SELECT 1 heartbeat to maintain the connection
        await db.execute(sql`SELECT 1`);
    } catch (err) {
        // Log the failure without allowing it to crash the server lifecycle
        console.error("DB Heartbeat Failed:", err);
    }
}, 300000);