import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createPool } from '../src/db.js';
import { createMockDetector } from '../src/detectors/mock.js';
import { migrate } from '../src/migrate.js';

/**
 * Tests run against a real PostgreSQL (DATABASE_URL), because the SQL is the part
 * most worth testing. CI provides one as a service container; locally run
 * `docker compose up -d db` first.
 */
export async function setupTestApp({ detector = createMockDetector(), env = {} } = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://facefinder:facefinder@localhost:5432/facefinder',
    JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing',
    FACE_DETECTOR: 'mock',
    AUTH_RATE_LIMIT: '1000',
    DETECT_RATE_LIMIT: '1000',
    ...env,
  });
  const db = createPool(config.databaseUrl);
  await migrate(db, { info: () => {} });
  await db.query('TRUNCATE detections, users RESTART IDENTITY CASCADE');
  const app = createApp({ db, detector, config });
  return { app, db, config };
}

export async function signUp(app, overrides = {}) {
  const body = { name: 'Arshath', email: `user${Math.random().toString(36).slice(2)}@example.com`, password: 'correct horse', ...overrides };
  const res = await request(app).post('/api/auth/register').send(body).expect(201);
  return { token: res.body.token, user: res.body.user, password: body.password };
}
