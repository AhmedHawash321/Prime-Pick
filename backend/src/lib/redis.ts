import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
export const redisClient = createClient({ url: redisUrl });

redisClient.connect().catch((err) => console.error("Redis Connection Error:", err));