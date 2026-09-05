import { PrismaClient } from "@generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { Bindings } from "../types";

export type * from "@generated/prisma/client";

export let db: PrismaClient;

let setupPromise: Promise<void> | undefined;

// Instantiate lazily, once per isolate, from request middleware rather than
// at module scope — the D1 binding only exists on `env`, and the client
// needs a warmup query on first use in a fresh isolate:
// https://github.com/cloudflare/workers-sdk/pull/8283
export function setupDb(env: Bindings): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      db = new PrismaClient({ adapter: new PrismaD1(env.DB) });
      await db.$queryRaw`SELECT 1`;
    })();
  }
  return setupPromise;
}
