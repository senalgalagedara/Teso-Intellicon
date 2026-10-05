import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Pooled HTTP client for the branch's Postgres. Route handlers, Server
 * Components and Server Actions all reach Postgres through this instance.
 */
export const sql = neon(process.env.DATABASE_URL!);

/**
 * Typed wrapper around the driver's tagged template. The driver returns
 * `Record<string, unknown>[]`, so each call site declares the row shape it
 * selected rather than spreading the whole table into memory.
 */
export async function query<Row>(
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<Row[]> {
  return (await sql(strings, ...params)) as Row[];
}
