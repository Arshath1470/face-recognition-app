import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupTestApp, signUp } from './helpers.js';

let app;
let db;

beforeEach(async () => {
  ({ app, db } = await setupTestApp());
});

afterEach(async () => {
  await db?.end();
});

describe('authentication', () => {
  it('registers, normalises the email and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '  Arshath Hussain ', email: 'Arshath@Example.COM', password: 'long enough' })
      .expect(201);

    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Arshath Hussain', email: 'arshath@example.com' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('rejects duplicate emails regardless of case', async () => {
    await signUp(app, { email: 'dup@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Someone', email: 'DUP@example.com', password: 'long enough' })
      .expect(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  it('returns per-field validation errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'nope', password: 'short' })
      .expect(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['email', 'name', 'password']);
  });

  it('logs in with the right password only', async () => {
    const { user, password } = await signUp(app);
    await request(app).post('/api/auth/login').send({ email: user.email, password }).expect(200);
    const wrong = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong pass' }).expect(401);
    expect(wrong.body.error).toBe('Email or password is incorrect');
    await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password }).expect(401);
  });

  it('protects profile routes', async () => {
    await request(app).get('/api/me').expect(401);
    await request(app).get('/api/me').set('Authorization', 'Bearer not-a-token').expect(401);
  });

  it('shows and updates the profile with scan stats', async () => {
    const { token } = await signUp(app, { name: 'Priya' });
    const auth = { Authorization: `Bearer ${token}` };

    const me = await request(app).get('/api/me').set(auth).expect(200);
    expect(me.body).toMatchObject({ name: 'Priya', stats: { scans: 0, facesFound: 0, lastScanAt: null } });

    const updated = await request(app).put('/api/me').set(auth).send({ name: 'Priya R' }).expect(200);
    expect(updated.body.name).toBe('Priya R');
  });

  it('deletes the account and all its scans', async () => {
    const { token } = await signUp(app);
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/detections').set(auth).send({ imageUrl: 'https://example.com/a.jpg' }).expect(201);

    await request(app).delete('/api/me').set(auth).expect(204);

    const { rows } = await db.query('SELECT COUNT(*) AS n FROM detections');
    expect(rows[0].n).toBe(0);
    await request(app).get('/api/me').set(auth).expect(401);
  });
});

describe('health', () => {
  it('reports the database and detector', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', detector: 'mock' });
  });
});
