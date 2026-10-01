import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DetectorError } from '../src/detectors/clarifai.js';
import { setupTestApp, signUp } from './helpers.js';

// Smallest valid PNG (1x1 transparent pixel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==',
  'base64',
);

let ctx;
let auth;

async function start(options) {
  ctx = await setupTestApp(options);
  const { token } = await signUp(ctx.app);
  auth = { Authorization: `Bearer ${token}` };
}

afterEach(async () => {
  await ctx?.db.end();
  ctx = null;
});

describe('detections with the mock detector', () => {
  beforeEach(() => start());

  it('detects faces from a URL and stores only the result', async () => {
    const res = await request(ctx.app)
      .post('/api/detections')
      .set(auth)
      .send({ imageUrl: 'https://images.example.com/team-photo.jpg' })
      .expect(201);

    expect(res.body).toMatchObject({ source: 'url', provider: 'mock', imageUrl: 'https://images.example.com/team-photo.jpg' });
    expect(res.body.faceCount).toBe(res.body.faces.length);
    for (const face of res.body.faces) {
      expect(face.box.top).toBeLessThan(face.box.bottom);
      expect(face.box.left).toBeLessThan(face.box.right);
      expect(face.confidence).toBeGreaterThan(0.9);
    }
  });

  it('is deterministic for the same image', async () => {
    const body = { imageUrl: 'https://images.example.com/same.jpg' };
    const a = await request(ctx.app).post('/api/detections').set(auth).send(body).expect(201);
    const b = await request(ctx.app).post('/api/detections').set(auth).send(body).expect(201);
    expect(b.body.faces).toEqual(a.body.faces);
  });

  it('accepts an uploaded image without storing the bytes', async () => {
    const res = await request(ctx.app)
      .post('/api/detections')
      .set(auth)
      .attach('image', PNG, { filename: 'pixel.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body).toMatchObject({ source: 'upload', imageUrl: null });
    const { rows } = await ctx.db.query('SELECT * FROM detections WHERE id = $1', [res.body.id]);
    expect(Object.values(rows[0]).some((value) => Buffer.isBuffer(value))).toBe(false);
  });

  it('rejects non-image uploads and bad links', async () => {
    await request(ctx.app)
      .post('/api/detections')
      .set(auth)
      .attach('image', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(400);

    const res = await request(ctx.app).post('/api/detections').set(auth).send({ imageUrl: 'ftp://example.com/x.jpg' }).expect(400);
    expect(res.body.fields.imageUrl).toBeDefined();

    await request(ctx.app).post('/api/detections').set(auth).send({}).expect(400);
  });

  it('pages through history newest first and keeps users apart', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(ctx.app).post('/api/detections').set(auth).send({ imageUrl: `https://example.com/${i}.jpg` }).expect(201);
    }

    const first = await request(ctx.app).get('/api/detections?limit=3').set(auth).expect(200);
    expect(first.body.items.map((d) => d.imageUrl)).toEqual([
      'https://example.com/4.jpg',
      'https://example.com/3.jpg',
      'https://example.com/2.jpg',
    ]);
    const second = await request(ctx.app).get(`/api/detections?limit=3&before=${first.body.nextBefore}`).set(auth).expect(200);
    expect(second.body.items).toHaveLength(2);
    expect(second.body.nextBefore).toBeNull();

    const other = await signUp(ctx.app);
    const otherAuth = { Authorization: `Bearer ${other.token}` };
    const empty = await request(ctx.app).get('/api/detections').set(otherAuth).expect(200);
    expect(empty.body.items).toEqual([]);
    await request(ctx.app).get(`/api/detections/${first.body.items[0].id}`).set(otherAuth).expect(404);
    await request(ctx.app).delete(`/api/detections/${first.body.items[0].id}`).set(otherAuth).expect(404);
  });

  it('updates profile stats and lets the owner delete a scan', async () => {
    const created = await request(ctx.app).post('/api/detections').set(auth).send({ imageUrl: 'https://example.com/x.jpg' });
    const me = await request(ctx.app).get('/api/me').set(auth).expect(200);
    expect(me.body.stats.scans).toBe(1);
    expect(me.body.stats.facesFound).toBe(created.body.faceCount);

    await request(ctx.app).delete(`/api/detections/${created.body.id}`).set(auth).expect(204);
    await request(ctx.app).get(`/api/detections/${created.body.id}`).set(auth).expect(404);
  });
});

describe('detector failures', () => {
  it('maps detector errors to clean HTTP errors without saving anything', async () => {
    const failing = {
      name: 'clarifai',
      detect: async () => {
        throw new DetectorError('The face detection service timed out. Try again shortly.', 503);
      },
    };
    await start({ detector: failing });

    const res = await request(ctx.app).post('/api/detections').set(auth).send({ imageUrl: 'https://example.com/x.jpg' }).expect(503);
    expect(res.body.error).toMatch(/timed out/);
    const { rows } = await ctx.db.query('SELECT COUNT(*) AS n FROM detections');
    expect(rows[0].n).toBe(0);
  });
});

describe('rate limiting', () => {
  it('limits scans per user per minute', async () => {
    await start({ env: { DETECT_RATE_LIMIT: '2' } });
    const body = { imageUrl: 'https://example.com/x.jpg' };
    await request(ctx.app).post('/api/detections').set(auth).send(body).expect(201);
    await request(ctx.app).post('/api/detections').set(auth).send(body).expect(201);
    const res = await request(ctx.app).post('/api/detections').set(auth).send(body).expect(429);
    expect(res.body.error).toMatch(/Wait a minute/);
  });
});
