import { describe, expect, it, vi } from 'vitest';
import { clarifaiUrl, createClarifaiDetector, DetectorError, parseClarifaiResponse } from '../src/detectors/clarifai.js';

// Trimmed real-world shape of a Clarifai face-detection response.
const sample = {
  status: { code: 10000, description: 'Ok' },
  outputs: [
    {
      status: { code: 10000, description: 'Ok' },
      data: {
        regions: [
          {
            region_info: { bounding_box: { top_row: 0.2, left_col: 0.6, bottom_row: 0.35, right_col: 0.7 } },
            value: 0.991,
          },
          {
            region_info: { bounding_box: { top_row: 0.1, left_col: 0.1, bottom_row: 0.5, right_col: 0.4 } },
            data: { concepts: [{ name: 'face', value: 0.99987 }] },
          },
          { region_info: { bounding_box: { top_row: 0.5, left_col: 0.5, bottom_row: 0.5, right_col: 0.6 } }, value: 0.5 },
        ],
      },
    },
  ],
};

const options = {
  pat: 'test-pat',
  baseUrl: 'https://api.clarifai.com',
  userId: 'clarifai',
  appId: 'main',
  modelId: 'face-detection',
  modelVersionId: null,
  timeoutMs: 1000,
};

describe('parseClarifaiResponse', () => {
  it('normalises boxes, keeps confidence and sorts largest first', () => {
    const faces = parseClarifaiResponse(sample);
    expect(faces).toEqual([
      { box: { top: 0.1, left: 0.1, bottom: 0.5, right: 0.4 }, confidence: 0.9999 },
      { box: { top: 0.2, left: 0.6, bottom: 0.35, right: 0.7 }, confidence: 0.991 },
    ]);
  });

  it('returns no faces for an empty region list', () => {
    expect(parseClarifaiResponse({ status: { code: 10000 }, outputs: [{ data: {} }] })).toEqual([]);
  });

  it('raises a DetectorError for API failures', () => {
    expect(() => parseClarifaiResponse({ status: { code: 11102, description: 'Invalid request' } })).toThrow(DetectorError);
    expect(() =>
      parseClarifaiResponse({ status: { code: 10000 }, outputs: [{ status: { code: 30002, description: 'Download failed' } }] }),
    ).toThrow(/Download failed/);
  });
});

describe('Clarifai detector', () => {
  it('builds the model URL with an optional version', () => {
    expect(clarifaiUrl(options)).toBe('https://api.clarifai.com/v2/users/clarifai/apps/main/models/face-detection/outputs');
    expect(clarifaiUrl({ ...options, modelVersionId: 'abc' })).toMatch(/models\/face-detection\/versions\/abc\/outputs$/);
  });

  it('sends URLs and uploads in the shape Clarifai expects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200, json: async () => sample });
    const detector = createClarifaiDetector(options, fetchImpl);

    await detector.detect({ url: 'https://example.com/face.jpg' });
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.Authorization).toBe('Key test-pat');
    expect(JSON.parse(init.body)).toEqual({ inputs: [{ data: { image: { url: 'https://example.com/face.jpg' } } }] });

    await detector.detect({ buffer: Buffer.from('abc') });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).inputs[0].data.image).toEqual({ base64: 'YWJj' });
  });

  it('turns network failures into a 503 DetectorError', async () => {
    const detector = createClarifaiDetector(options, vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(detector.detect({ url: 'https://example.com/x.jpg' })).rejects.toMatchObject({ status: 503 });
  });
});
