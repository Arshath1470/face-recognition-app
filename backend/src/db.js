import pg from 'pg';

// Postgres BIGINT/NUMERIC come back as strings by default; COUNT(*) is BIGINT.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

export function createPool(databaseUrl) {
  return new pg.Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000 });
}
