import type { FastifyInstance } from "fastify";

import { requirePearlUser, resolvePearlUserId } from "../authFromRequest.js";
import type { Env } from "../env.js";
import { parseUsPhoneToE164 } from "../phone.js";
import { prisma } from "../prisma.js";
import { appointmentBodySchema } from "../validation/appointmentBody.js";

export async function registerAppointmentRoutes(
  app: FastifyInstance,
  env: Env,
) {
  app.post("/appointments", async (request, reply) => {
    const parsed = appointmentBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const phoneE164 = parseUsPhoneToE164(parsed.data.phone);
    if (!phoneE164) {
      return reply.code(400).send({
        error: "validation_error",
        fields: {
          phone: ["Enter a valid 10-digit US phone number."],
        },
      });
    }

    const userId = await resolvePearlUserId(env, request);
    const email = parsed.data.email.trim().toLowerCase();
    const scheduledOn = new Date(`${parsed.data.date}T00:00:00.000Z`);

    await prisma.appointment.create({
      data: {
        userId,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        email,
        phoneE164,
        scheduledOn,
        message: parsed.data.message.trim(),
      },
    });

    return reply.code(201).send({ ok: true });
  });

  app.get("/me/appointments", async (request, reply) => {
    const pearl = await requirePearlUser(env, request);
    if (!pearl) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const row = await prisma.user.findUnique({
      where: { id: pearl.userId },
      select: { id: true },
    });
    if (!row) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const rows = await prisma.appointment.findMany({
      where: { userId: pearl.userId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      appointments: rows.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phoneE164: r.phoneE164,
        scheduledOn: r.scheduledOn.toISOString().slice(0, 10),
        message: r.message,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });
}
