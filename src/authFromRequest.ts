import type { FastifyRequest } from "fastify";

import { verifyPearlAccessToken } from "./accessJwt.js";
import { ACCESS_COOKIE } from "./authCookies.js";
import { bearerToken } from "./bearer.js";
import type { Env } from "./env.js";

export function accessTokenFromRequest(request: FastifyRequest): string | null {
  const fromAuth = bearerToken(request.headers.authorization);
  if (fromAuth) return fromAuth;
  const c = request.cookies[ACCESS_COOKIE];
  return c && c.length > 0 ? c : null;
}

export async function resolvePearlUserId(
  env: Env,
  request: FastifyRequest,
): Promise<string | null> {
  const token = accessTokenFromRequest(request);
  if (!token) return null;
  const pearl = await verifyPearlAccessToken(env.JWT_SECRET, token);
  return pearl?.userId ?? null;
}

export async function requirePearlUser(
  env: Env,
  request: FastifyRequest,
): Promise<{ userId: string; email: string } | null> {
  const token = accessTokenFromRequest(request);
  if (!token) return null;
  const pearl = await verifyPearlAccessToken(env.JWT_SECRET, token);
  if (!pearl) return null;
  return { userId: pearl.userId, email: pearl.email };
}
