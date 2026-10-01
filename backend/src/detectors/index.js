import { createClarifaiDetector } from './clarifai.js';
import { createMockDetector } from './mock.js';

export function createDetector(config) {
  return config.detector === 'clarifai' ? createClarifaiDetector(config.clarifai) : createMockDetector();
}

export { DetectorError } from './clarifai.js';
