import { useEffect, useState } from 'react';
import { api } from '../api.js';

/** Which detector the API is using ("clarifai" or "mock"), so the UI can label simulated results. */
export function useDetector() {
  const [detector, setDetector] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api('/api/health')
      .then((health) => !cancelled && setDetector(health.detector))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return detector;
}
