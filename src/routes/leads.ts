import type { FastifyInstance } from "fastify";

import { createLeadRequestLogger } from "../leadLogger.js";
import type { Env } from "../env.js";
import { parseUsPhoneToE164 } from "../phone.js";
import { leadRequestBodySchema } from "../validation/leadRequestBody.js";

export async function registerLeadRoutes(app: FastifyInstance, env: Env) {
  const leadLogger = createLeadRequestLogger(env);

  app.post("/lead-requests", async (request, reply) => {
    const parsed = leadRequestBodySchema.safeParse(request.body);
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

    const base = {
      type: "lead_request" as const,
      source: parsed.data.source,
      phoneE164,
      ip:
        typeof request.ip === "string" && request.ip.length > 0
          ? request.ip
          : undefined,
      userAgent:
        typeof request.headers["user-agent"] === "string"
          ? request.headers["user-agent"]
          : undefined,
    };

    if (parsed.data.source === "patient-welcome") {
      leadLogger.info(base, "lead_request_accepted");
    } else {
      leadLogger.info(
        {
          ...base,
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
        },
        "lead_request_accepted",
      );
    }

    return reply.code(201).send({ ok: true });
  });
}
