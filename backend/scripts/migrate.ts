/**
 * Simple, dependency-free SQL migration runner.
 *
 * - Reads all .sql files in db/migrations/, sorted by filename (hence the
 *   001_, 002_ prefixes - order is significant and must never be reused).
 * - Tracks applied migrations in a `schema_migrations` table so re-running
 *   this script is idempotent (safe to run on every deploy).
 * - Each migration file runs inside its own transaction: if a statement
 *   fails, that file's changes are rolled back and the script stops,
 *   leaving the DB in the last known-good state.
 *
 * Usage: npm run migrate
 */
import fs from "fs";
import path from "path";
import { pool } from "../src/config/db";
import { logger } from "../src/utils/logger";

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const res = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations");
  return new Set(res.rows.map((r) => r.filename));
}

async function runMigration(filename: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, "utf-8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await client.query("COMMIT");
    logger.info(`✅ Applied migration: ${filename}`);
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`❌ Migration failed: ${filename}`, { error: (err as Error).message });
    throw err;
  } finally {
    client.release();
  }
}

async function migrate(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const allFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // filename prefix (001_, 002_...) enforces execution order

  const pending = allFiles.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    logger.info("No pending migrations. Database is up to date.");
    return;
  }

  logger.info(`Found ${pending.length} pending migration(s): ${pending.join(", ")}`);
  for (const file of pending) {
    await runMigration(file);
  }
  logger.info("🎉 All migrations applied successfully.");
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
