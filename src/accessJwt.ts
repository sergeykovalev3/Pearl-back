import * as jose from "jose";

const ISS = "pearl-back";

const ACCESS_TYP = "access";
const REFRESH_TYP = "refresh";

export async function signPearlAccessToken(
  secret: string,
  payload: { userId: string; email: string },
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new jose.SignJWT({
    email: payload.email,
    typ: ACCESS_TYP,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(ISS)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);
}

export async function verifyPearlAccessToken(
  secret: string,
  token: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: ISS,
      algorithms: ["HS256"],
    });
    if (payload.typ !== ACCESS_TYP) return null;
    const sub = payload.sub;
    const email = payload.email;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    return { userId: sub, email };
  } catch {
    return null;
  }
}

export async function signPearlRefreshToken(
  secret: string,
  payload: { userId: string },
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new jose.SignJWT({ typ: REFRESH_TYP })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(ISS)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyPearlRefreshToken(
  secret: string,
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: ISS,
      algorithms: ["HS256"],
    });
    if (payload.typ !== REFRESH_TYP) return null;
    const sub = payload.sub;
    if (typeof sub !== "string") return null;
    return { userId: sub };
  } catch {
    return null;
  }
}
