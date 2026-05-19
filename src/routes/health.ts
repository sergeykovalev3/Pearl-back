import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ok", database: true });
    } catch {
      return reply.code(503).send({ status: "error", database: false });
    }
  });
}
