import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { z } from 'zod';
import { hashPassword, issueToken, requireAuth, verifyPassword } from './auth.js';
import { DetectorError } from './detectors/index.js';
import { HttpError, badRequest, conflict, errorHandler, fieldErrors, notFound, unauthorized } from './errors.js';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Keep it under 80 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Keep it under 80 characters'),
});

const urlSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .max(2048, 'That link is too long')
    .url('Paste a full image link starting with http:// or https://')
    .refine((value) => /^https?:\/\//i.test(value), 'Only http and https links are supported'),
});

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parse(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw badRequest('Check the highlighted fields', fieldErrors(result.error));
  return result.data;
}

const toUser = (row) => ({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at });

const toDetection = (row) => ({
  id: row.id,
  source: row.source,
  imageUrl: row.image_url,
  faceCount: row.face_count,
  faces: row.faces,
  provider: row.provider,
  durationMs: row.duration_ms,
  createdAt: row.created_at,
});

/**
 * Builds the Express app. Dependencies are injected so tests can use a real
 * database with the mock detector, or a stubbed Clarifai client.
 */
export function createApp({ db, detector, config, logger = pino({ level: config.logLevel }) }) {
  const app = express();
  const auth = requireAuth(config);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(express.json({ limit: '32kb' }));

  if (config.corsOrigin) {
    app.use((req, res, next) => {
      res.set('Access-Control-Allow-Origin', config.corsOrigin);
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    });
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.rateLimits.authPerWindow,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Wait a few minutes and try again.' },
  });

  const detectLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.rateLimits.detectPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.userId}`,
    message: { error: 'You are scanning very quickly. Wait a minute and try again.' },
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1 },
    fileFilter: (req, file, cb) =>
      ALLOWED_TYPES.has(file.mimetype)
        ? cb(null, true)
        : cb(badRequest('Upload a JPEG, PNG or WebP image', { image: 'Unsupported file type' })),
  });

  // --- health ---------------------------------------------------------------
  app.get('/api/health', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', detector: detector.name });
    } catch {
      res.status(503).json({ status: 'degraded', detector: detector.name, database: 'unreachable' });
    }
  });

  // --- auth -----------------------------------------------------------------
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const input = parse(registerSchema, req.body);
    const passwordHash = await hashPassword(input.password);
    try {
      const { rows } = await db.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [input.name, input.email, passwordHash],
      );
      const user = toUser(rows[0]);
      res.status(201).json({ token: issueToken(user, config), user });
    } catch (error) {
      if (error.code === '23505') throw conflict('An account with this email already exists');
      throw error;
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const input = parse(loginSchema, req.body);
    const { rows } = await db.query('SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1', [
      input.email,
    ]);
    const row = rows[0];
    if (!row || !(await verifyPassword(input.password, row.password_hash))) {
      throw unauthorized('Email or password is incorrect');
    }
    const user = toUser(row);
    res.json({ token: issueToken(user, config), user });
  });

  // --- profile ----------------------------------------------------------------
  app.get('/api/me', auth, async (req, res) => {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              COUNT(d.id)                     AS scans,
              COALESCE(SUM(d.face_count), 0)  AS faces_found,
              MAX(d.created_at)               AS last_scan_at
         FROM users u
         LEFT JOIN detections d ON d.user_id = u.id
        WHERE u.id = $1
        GROUP BY u.id`,
      [req.userId],
    );
    if (!rows[0]) throw unauthorized('Your account no longer exists');
    const row = rows[0];
    res.json({
      ...toUser(row),
      stats: { scans: row.scans, facesFound: row.faces_found, lastScanAt: row.last_scan_at },
    });
  });

  app.put('/api/me', auth, async (req, res) => {
    const input = parse(profileSchema, req.body);
    const { rows } = await db.query('UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, created_at', [
      input.name,
      req.userId,
    ]);
    if (!rows[0]) throw notFound('Account not found');
    res.json(toUser(rows[0]));
  });

  app.delete('/api/me', auth, async (req, res) => {
    await db.query('DELETE FROM users WHERE id = $1', [req.userId]);
    res.status(204).end();
  });

  // --- detections -------------------------------------------------------------
  app.post('/api/detections', auth, detectLimiter, upload.single('image'), async (req, res) => {
    let image;
    if (req.file) {
      image = { buffer: req.file.buffer, source: 'upload', url: null };
    } else {
      const { imageUrl } = parse(urlSchema, req.body);
      image = { url: imageUrl, source: 'url' };
    }

    const started = performance.now();
    let faces;
    try {
      faces = await detector.detect(image);
    } catch (error) {
      if (error instanceof DetectorError) throw new HttpError(error.status, error.message);
      throw error;
    }
    const durationMs = Math.round(performance.now() - started);

    const { rows } = await db.query(
      `INSERT INTO detections (user_id, source, image_url, face_count, faces, provider, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, image.source, image.url, faces.length, JSON.stringify(faces), detector.name, durationMs],
    );
    res.status(201).json(toDetection(rows[0]));
  });

  app.get('/api/detections', auth, async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 100);
    const before = Number.parseInt(req.query.before, 10);
    const { rows } = await db.query(
      `SELECT * FROM detections
        WHERE user_id = $1 AND ($2::int IS NULL OR id < $2)
        ORDER BY id DESC
        LIMIT $3`,
      [req.userId, Number.isFinite(before) ? before : null, limit + 1],
    );
    const page = rows.slice(0, limit).map(toDetection);
    res.json({ items: page, nextBefore: rows.length > limit ? page.at(-1).id : null });
  });

  app.get('/api/detections/:id', auth, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) throw notFound('Scan not found');
    const { rows } = await db.query('SELECT * FROM detections WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (!rows[0]) throw notFound('Scan not found');
    res.json(toDetection(rows[0]));
  });

  app.delete('/api/detections/:id', auth, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const { rowCount } = await db.query('DELETE FROM detections WHERE id = $1 AND user_id = $2', [
      Number.isFinite(id) ? id : -1,
      req.userId,
    ]);
    if (rowCount === 0) throw notFound('Scan not found');
    res.status(204).end();
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'No such endpoint' }));
  app.use(errorHandler(logger));
  return app;
}
