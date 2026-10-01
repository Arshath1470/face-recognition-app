const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function loadConfig(env = process.env) {
  const config = {
    port: toInt(env.PORT, 4000),
    databaseUrl: env.DATABASE_URL ?? 'postgres://facefinder:facefinder@localhost:5432/facefinder',
    jwtSecret: env.JWT_SECRET ?? 'dev-only-secret-change-me-before-deploying-0123456789',
    jwtTtl: env.JWT_TTL ?? '2h',
    corsOrigin: env.CORS_ORIGIN ?? null,
    detector: (env.FACE_DETECTOR ?? (env.CLARIFAI_PAT ? 'clarifai' : 'mock')).toLowerCase(),
    clarifai: {
      pat: env.CLARIFAI_PAT ?? null,
      baseUrl: env.CLARIFAI_BASE_URL ?? 'https://api.clarifai.com',
      userId: env.CLARIFAI_USER_ID ?? 'clarifai',
      appId: env.CLARIFAI_APP_ID ?? 'main',
      modelId: env.CLARIFAI_MODEL_ID ?? 'face-detection',
      modelVersionId: env.CLARIFAI_MODEL_VERSION_ID ?? null,
      timeoutMs: toInt(env.CLARIFAI_TIMEOUT_MS, 10_000),
    },
    maxUploadBytes: toInt(env.MAX_UPLOAD_MB, 5) * 1024 * 1024,
    rateLimits: {
      authPerWindow: toInt(env.AUTH_RATE_LIMIT, 20),
      detectPerMinute: toInt(env.DETECT_RATE_LIMIT, 30),
    },
    logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
  };

  if (Buffer.byteLength(config.jwtSecret) < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes');
  }
  if (!['clarifai', 'mock'].includes(config.detector)) {
    throw new Error(`FACE_DETECTOR must be "clarifai" or "mock", got "${config.detector}"`);
  }
  if (config.detector === 'clarifai' && !config.clarifai.pat) {
    throw new Error('FACE_DETECTOR=clarifai needs CLARIFAI_PAT (a Clarifai personal access token)');
  }
  return config;
}
