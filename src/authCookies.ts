import type { FastifyReply } from "fastify";

import type { Env } from "./env.js";

export const ACCESS_COOKIE = "pearl_access";
export const REFRESH_COOKIE = "pearl_refresh";

const ACCESS_MAX_AGE_SEC = 15 * 60;
const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;

/**
 * Local dev: Lax + optional insecure HTTP is fine when front and API share localhost.
 * Production with front and API on different hosts (e.g. two Railway URLs) is cross-site;
 * browsers require SameSite=None and Secure for credentialed fetch/CORS.
 * CHIPS: Partitioned avoids future third-party cookie deprecation warnings in Chrome.
 */
export function sessionCookieBase(env: Env) {
  const production = env.NODE_ENV === "production";
  return {
    path: "/" as const,
    httpOnly: true,
    secure: production,
    sameSite: (production ? "none" : "lax") as "lax" | "none",
    ...(production ? { partitioned: true as const } : {}),
  };
}

export function setAccessCookie(
  reply: FastifyReply,
  env: Env,
  accessToken: string,
) {
  reply.setCookie(ACCESS_COOKIE, accessToken, {
    ...sessionCookieBase(env),
    maxAge: ACCESS_MAX_AGE_SEC,
  });
}

export function attachSessionCookies(
  reply: FastifyReply,
  env: Env,
  tokens: { access: string; refresh: string },
) {
  setAccessCookie(reply, env, tokens.access);
  reply.setCookie(REFRESH_COOKIE, tokens.refresh, {
    ...sessionCookieBase(env),
    maxAge: REFRESH_MAX_AGE_SEC,
  });
}

export function clearSessionCookies(reply: FastifyReply, env: Env) {
  const base = sessionCookieBase(env);
  const production = env.NODE_ENV === "production";
  reply.clearCookie(ACCESS_COOKIE, {
    path: base.path,
    sameSite: base.sameSite,
    secure: base.secure,
    ...(production ? { partitioned: true } : {}),
  });
  reply.clearCookie(REFRESH_COOKIE, {
    path: base.path,
    sameSite: base.sameSite,
    secure: base.secure,
    ...(production ? { partitioned: true } : {}),
  });
}
