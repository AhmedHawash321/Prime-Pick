import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Server } from "http";
import { createClient } from "redis";
import { ENV } from "./config/env";
import { clerkMiddleware } from "@clerk/express";
import { createSchema, createYoga } from "graphql-yoga";
import { mergedTypeDefs } from "./graphql/typedefs";
import { mergedResolvers } from "./graphql/resolvers";
import { createContext, GraphQLContext } from "./authorization/context";
import { stripe } from "./middleware/services/stripe.service";
import * as queries from "./db/queries";
import axios from "axios";
import { createRouteHandler } from "uploadthing/express";
import { ourFileRouter } from "./uploadthing/router";
import { db } from "./db"; 
import { sql } from "drizzle-orm";

const app = express();

// --- Redis Client Configuration ---
const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const redisClient = createClient({ url: redisUrl });
redisClient.connect().catch(console.error);

// --- Rate Limiter Setup ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 5 : 150,
  message: "Too Many Requests, Please Try Again Later",
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
});

// --- CORS Policy Configuration ---
const corsOptions: cors.CorsOptions = {
  origin: ["http://localhost:3000", "http://localhost:5000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "cache-control",
    "x-uploadthing-version",
    "x-uploadthing-api-key",
    "x-uploadthing-fe-package",
    "x-uploadthing-package",
    "traceparent",
    "tracestate",
    "baggage",
    "b3", 
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// --- Global Authentication Middleware ---
app.use(clerkMiddleware());

// --- UploadThing Route Handler ---
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: ourFileRouter,
  })
);

// --- Stripe Webhook Endpoint (Requires raw body) ---
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        ENV.STRIPE_WEBHOOK_SECRET!
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const orderId = session.metadata.orderId;
        const userId = session.metadata.userId;

        await queries.updateOrderStatus(orderId, "processing");

        if (userId) {
          await queries.clearCart(userId); // clear cart after payment done successfully
          console.log(`Cart cleared for user: ${userId}`);
        }
      }

      return res.json({ received: true });
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// --- General Purpose Middlewares ---
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- AI Agent Proxy Endpoint ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "Invalid message format.",
        success: false,
      });
    }

    const agentUrl = process.env.AI_AGENT_URL || "http://localhost:8080";

    const response = await axios.post(
      `${agentUrl}/chat`,
      { message },
      { timeout: 60000 }
    );

    return res.json(response.data);
  } catch (error: any) {
    console.error("AI Agent Error:", error.message);
    return res.status(500).json({
      reply: "The AI assistant is currently unavailable.",
      success: false,
    });
  }
});

// --- AI Comment Moderation Proxy Endpoint ---
app.post("/api/moderate", async (req, res) => {
  try {
    const { comment, product_title } = req.body;

    const agentUrl = process.env.AI_AGENT_URL || "http://localhost:8080";

    const response = await axios.post(
      `${agentUrl}/moderate`, // Communicate with Rust moderation service
      { comment, product_title },
      { timeout: 10000 } // Moderation has a shorter timeout than chat
    );

    return res.json(response.data);
  } catch (error: any) {
    console.error("Moderation Error:", error.message);
    // Default to 'pending' if the AI service is unavailable to ensure manual review
    return res.json({ 
      decision: "pending", 
      reason: "Moderation service unavailable",
      success: false 
    });
  }
});

// --- System Health Check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- GraphQL Yoga API Server ---
const yoga = createYoga<any, GraphQLContext>({
  schema: createSchema({
    typeDefs: mergedTypeDefs,
    resolvers: mergedResolvers,
  }),
  context: createContext,
});

app.use("/graphql", yoga);

// --- Optimization: Cache Warm-up Function ---
async function warmupCache(port: number) {
  console.log("Starting Cache Warm-up...");
  try {
    await axios.post(`http://localhost:${port}/graphql`, {
      query: `
        query { 
          getArticles { id title }
          getArticles(search: "") { id title }
        }
      `
    }, { timeout: 10000 });
    console.log("Cache Warm-up Completed.");
  } catch (error) {
    console.error("Cache Warm-up partially failed or timed out.");
  }
}

// --- Optimization: Neon DB Keep-Alive ---
// Pings Neon every 5 minutes to prevent database from entering sleep mode
setInterval(async () => {
  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    console.error("DB Heartbeat Error:", err);
  }
}, 5 * 60 * 1000);

// --- Server Lifecycle Management ---
export default app;

let server: Server | undefined;

if (process.env.NODE_ENV !== "test") {
  const port = Number(ENV.PORT) || 5000;

  server = app.listen(port, "0.0.0.0", () => {
    console.log(`Backend ready at http://localhost:${port}/graphql`);
    console.log(`AI Chat Proxy at http://localhost:${port}/api/chat`);
    console.log(`AI Moderation Proxy at http://localhost:${port}/api/moderate`);
    console.log(`UploadThing at http://localhost:${port}/api/uploadthing`);
    
    // Execute Warm-up after server is fully bound
    setTimeout(() => warmupCache(port), 1000);
  });

  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    const forceExit = setTimeout(() => {
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      await redisClient.quit();
      if (server) {
        server.close(() => process.exit(0));
      } else {
        process.exit(0);
      }
    } catch {
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}