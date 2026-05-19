import "dotenv/config";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { loadEnv } from "./env.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerV1Routes } from "./routes/v1.js";

const env = loadEnv();

const app = Fastify({
  logger: env.NODE_ENV !== "test",
});

const origins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

await app.register(cookie);
await app.register(cors, {
  origin: origins,
  credentials: true,
});

app.get("/", async () => ({
  service: "pearl-back",
  docs: "See readme.md",
}));

await registerHealthRoutes(app);
await app.register(async (f) => registerV1Routes(f, env), { prefix: "/v1" });

await app.listen({ port: env.PORT, host: "0.0.0.0" });
