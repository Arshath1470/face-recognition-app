import { createHash } from 'node:crypto';

/**
 * Deterministic stand-in used when no Clarifai token is configured (local demos, CI).
 * The same image always yields the same simulated boxes, so tests are stable.
 * The UI labels results from this detector as simulated.
 */
export function createMockDetector() {
  return {
    name: 'mock',
    async detect(image) {
      const seed = createHash('sha256')
        .update(image.url ?? image.buffer)
        .digest();
      const count = seed[0] % 4; // 0-3 faces
      const faces = [];
      for (let i = 0; i < count; i += 1) {
        const byte = (k) => seed[1 + i * 5 + k] / 255;
        const size = 0.14 + byte(0) * 0.16;
        const left = 0.05 + ((i + byte(1) * 0.6) / Math.max(count, 1)) * (0.9 - size);
        const top = 0.08 + byte(2) * (0.6 - size);
        faces.push({
          box: {
            top: round4(top),
            left: round4(left),
            bottom: round4(top + size * 1.25),
            right: round4(left + size),
          },
          confidence: round4(0.9 + byte(3) * 0.0999),
        });
      }
      return faces;
    },
  };
}

const round4 = (n) => Math.round(n * 10_000) / 10_000;
