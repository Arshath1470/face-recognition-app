import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

/**
 * Minimal forward-only migration runner: applies every migrations/NNN_*.sql file that
 * is not yet recorded in schema_migrations, each inside its own transaction.
 * An advisory lock keeps two replicas starting at once from racing.
 */
export async function migrate(pool, log = console) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(727274)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log.info?.(`applied migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    client.release();
  }
}

// `npm run migrate`
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const pool = createPool(loadConfig().databaseUrl);
  migrate(pool)
    .then(() => console.log('migrations up to date'))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
