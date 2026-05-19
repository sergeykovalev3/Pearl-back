import type { FastifyInstance } from "fastify";

import { requirePearlUser } from "../authFromRequest.js";
import type { Env } from "../env.js";
import { prisma } from "../prisma.js";
import { registerAppointmentRoutes } from "./appointments.js";
import { registerAuthRoutes } from "./auth.js";
import { registerLeadRoutes } from "./leads.js";

export async function registerV1Routes(app: FastifyInstance, env: Env) {
  await app.register(async (f) => registerAuthRoutes(f, env), {
    prefix: "/auth",
  });

  await registerAppointmentRoutes(app, env);
  await registerLeadRoutes(app, env);

  app.get("/me", async (request, reply) => {
    const pearl = await requirePearlUser(env, request);
    if (!pearl) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const row = await prisma.user.findUnique({
      where: { id: pearl.userId },
      select: { id: true, email: true, fullName: true },
    });
    if (!row) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    return reply.send({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
    });
  });
}
