/**
 * Seed runner - for LOCAL/DEV use only. Never run against production
 * with these default credentials.
 *
 * 1. Executes every .sql file in db/seeds/ (sample councils, etc.)
 * 2. Creates one bootstrap Super Admin account so you have a way to log
 *    in and start managing the system (bulk-uploading real council data,
 *    creating other admin accounts) before any other user exists.
 *
 * Usage: npm run seed
 */
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { pool } from "../src/config/db";
import { logger } from "../src/utils/logger";
import { generateMfaSecret } from "../src/utils/mfa";

const SEEDS_DIR = path.join(__dirname, "..", "db", "seeds");
const BCRYPT_ROUNDS = 12;

async function runSqlSeeds(): Promise<void> {
  // Simple idempotency guard: councils.sql has no natural unique key to
  // ON CONFLICT against, so instead we just skip seeding entirely if the
  // table already has data - safe for repeated `npm run seed` runs.
  const existing = await pool.query("SELECT COUNT(*) FROM councils");
  if (Number(existing.rows[0].count) > 0) {
    logger.info("Councils already seeded, skipping SQL seed files.");
    return;
  }

  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(SEEDS_DIR, file), "utf-8");
    await pool.query(sql);
    logger.info(`Seeded: ${file}`);
  }
}

async function createSuperAdmin(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? "superadmin@cscms.cm";
  const plainPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if ((existing.rowCount ?? 0) > 0) {
    logger.info(`Super admin already exists (${email}), skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  const mfaSecret = generateMfaSecret();

  await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active, mfa_secret)
     VALUES ($1, $2, $3, $4, 'super_admin', true, $5)`,
    ["Super", "Admin", email, passwordHash, mfaSecret]
  );

  logger.info(`✅ Super admin created: ${email} (password: ${plainPassword} - CHANGE IMMEDIATELY)`);
}

async function seed(): Promise<void> {
  await runSqlSeeds();
  await createSuperAdmin();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("Seeding failed", { error: err.message });
    process.exit(1);
  });
