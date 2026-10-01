import pino from 'pino';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { createDetector } from './detectors/index.js';
import { migrate } from './migrate.js';

const config = loadConfig();
const logger = pino({ level: config.logLevel });
const db = createPool(config.databaseUrl);

await migrate(db, { info: (msg) => logger.info(msg) });

const detector = createDetector(config);
const app = createApp({ db, detector, config, logger });
const server = app.listen(config.port, () => {
  logger.info(`FaceFinder API listening on :${config.port} using the ${detector.name} detector`);
});

// Graceful shutdown so Docker/Kubernetes rollouts don't cut requests mid-flight.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => db.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
