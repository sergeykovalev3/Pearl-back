import fs from "node:fs";
import path from "node:path";

import pino from "pino";

import type { Env } from "./env.js";

export function createLeadRequestLogger(env: Env): pino.Logger {
  if (env.NODE_ENV === "production") {
    const resolved = path.isAbsolute(env.LEAD_REQUEST_LOG_PATH)
      ? env.LEAD_REQUEST_LOG_PATH
      : path.join(process.cwd(), env.LEAD_REQUEST_LOG_PATH);

    fs.mkdirSync(path.dirname(resolved), { recursive: true });

    return pino(
      {
        name: "lead-requests",
        level: env.LOG_LEVEL,
      },
      pino.destination({ dest: resolved, sync: false }),
    );
  }

  return pino({
    name: "lead-requests",
    level: env.LOG_LEVEL,
  });
}
