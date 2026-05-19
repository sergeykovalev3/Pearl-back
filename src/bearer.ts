export function bearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const t = authorization.slice("Bearer ".length).trim();
  return t.length ? t : null;
}
