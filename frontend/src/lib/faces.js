/** Converts a normalised (0..1) face box into CSS percentages for an overlay. */
export function boxStyle(box) {
  const pct = (n) => `${(n * 100).toFixed(2)}%`;
  return {
    left: pct(box.left),
    top: pct(box.top),
    width: pct(box.right - box.left),
    height: pct(box.bottom - box.top),
  };
}

export function formatConfidence(confidence) {
  if (confidence === null || confidence === undefined) return 'confidence not reported';
  const pct = confidence * 100;
  return `${pct >= 99.95 ? '99.9' : pct.toFixed(1)}% confident`;
}

export function faceSummary(count) {
  if (count === 0) return 'No faces found';
  return count === 1 ? '1 face' : `${count} faces`;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const absolute = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function when(iso, now = Date.now()) {
  if (!iso) return '';
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), 'day');
  return absolute.format(new Date(iso));
}

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Returns an error message for a file the API would reject, or null. */
export function validateFile(file) {
  if (!file) return 'Choose an image first.';
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Use a JPEG, PNG or WebP image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'That image is over 5 MB. Try a smaller one.';
  return null;
}
