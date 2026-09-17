import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

// Single shared pool for the whole app (reused across requests).
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
});

pool.on("error", (err) => {
  // Unexpected errors on idle clients (e.g. connection dropped) - log, don't crash.
  logger.error("Unexpected PostgreSQL pool error", { error: err.message });
});

/**
 * Generic parameterized query helper.
 * ALWAYS use parameterized queries ($1, $2, ...) - never string-concatenate
 * user input into SQL. This is the primary defense against SQL injection.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn("Slow query detected", { text, duration });
  }
  return result;
}

/**
 * Transaction helper: runs `fn` with a dedicated client inside BEGIN/COMMIT,
 * automatically ROLLBACK on error. Use for any multi-statement write
 * (e.g. approve request + insert audit log must succeed/fail together).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDbConnection(): Promise<void> {
  const res = await pool.query("SELECT NOW()");
  logger.info(`✅ Database connected at ${res.rows[0].now}`);
}
