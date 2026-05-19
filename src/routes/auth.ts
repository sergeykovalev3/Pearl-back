import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";

import {
  signPearlAccessToken,
  signPearlRefreshToken,
  verifyPearlRefreshToken,
} from "../accessJwt.js";
import {
  attachSessionCookies,
  clearSessionCookies,
  REFRESH_COOKIE,
  setAccessCookie,
} from "../authCookies.js";
import type { Env } from "../env.js";
import { parseUsPhoneToE164 } from "../phone.js";
import { prisma } from "../prisma.js";
import { loginBodySchema } from "../validation/loginBody.js";
import { registerBodySchema } from "../validation/registerBody.js";

const BCRYPT_COST = 12;

import type { FastifyReply } from "fastify";

async function commitSession(
  reply: FastifyReply,
  env: Env,
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneE164: string;
    createdAt: Date;
  },
) {
  const access = await signPearlAccessToken(env.JWT_SECRET, {
    userId: user.id,
    email: user.email,
  });
  const refresh = await signPearlRefreshToken(env.JWT_SECRET, {
    userId: user.id,
  });
  attachSessionCookies(reply, env, { access, refresh });
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phoneE164,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

export async function registerAuthRoutes(app: FastifyInstance, env: Env) {
  app.post("/register", async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);
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

    const email = parsed.data.email.trim().toLowerCase();
    const fullName = parsed.data.name.trim();
    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phoneE164,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneE164: true,
          createdAt: true,
        },
      });

      const body = await commitSession(reply, env, user);
      return reply.code(201).send(body);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return reply.code(409).send({
          error: "email_taken",
          message: "An account with this email already exists.",
        });
      }
      throw error;
    }
  });

  app.post("/login", async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneE164: true,
        createdAt: true,
        passwordHash: true,
      },
    });

    if (
      !user ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash))
    ) {
      return reply.code(401).send({
        error: "invalid_credentials",
        message: "Invalid email or password.",
      });
    }

    const { passwordHash: _, ...rest } = user;
    const body = await commitSession(reply, env, rest);
    return reply.send(body);
  });

  app.post("/refresh", async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE];
    if (!raw) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const verified = await verifyPearlRefreshToken(env.JWT_SECRET, raw);
    if (!verified) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const row = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { id: true, email: true },
    });
    if (!row) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const access = await signPearlAccessToken(env.JWT_SECRET, {
      userId: row.id,
      email: row.email,
    });
    setAccessCookie(reply, env, access);
    return reply.send({ ok: true });
  });

  app.post("/logout", async (_request, reply) => {
    clearSessionCookies(reply, env);
    return reply.send({ ok: true });
  });
}
