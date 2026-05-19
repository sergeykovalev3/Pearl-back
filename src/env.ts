import { z } from "zod";

/**
 * Browsers send `Origin` with scheme (`https://app.example.com`). If env lists only
 * the hostname, CORS will not match — normalize like a URL base.
 */
function normalizeCorsOriginEntry(entry: string): string {
  const t = entry.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  const isLocal =
    /^(localhost|127\.0\.0\.1)(\:|$)/i.test(t) || t.startsWith("[::1]");
  return `${isLocal ? "http" : "https"}://${t}`;
}

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .refine((s) => s.trim() !== "*", {
      message:
        "CORS_ORIGIN cannot be * when using cookie credentials; set explicit origins",
    }),
  JWT_SECRET: z.string().min(16),
  /** Relative to cwd unless absolute — NDJSON line log for marketing lead submissions (production). */
  LEAD_REQUEST_LOG_PATH: z
    .string()
    .min(1)
    .default("logs/lead-requests.ndjson"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  const d = parsed.data;
  const corsNormalized = d.CORS_ORIGIN.split(",")
    .map(normalizeCorsOriginEntry)
    .filter(Boolean)
    .join(",");
  return { ...d, CORS_ORIGIN: corsNormalized };
}
