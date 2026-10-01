/**
 * Clarifai face-detection over the v2 REST API.
 *
 *   POST {base}/v2/users/{user}/apps/{app}/models/{model}[/versions/{version}]/outputs
 *   Authorization: Key <personal access token>
 *
 * Each detected face comes back as outputs[0].data.regions[i].region_info.bounding_box
 * with top_row / left_col / bottom_row / right_col as fractions (0..1) of the image size.
 */
export class DetectorError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const SUCCESS = 10000;

export function clarifaiUrl({ baseUrl, userId, appId, modelId, modelVersionId }) {
  const version = modelVersionId ? `/versions/${encodeURIComponent(modelVersionId)}` : '';
  return `${baseUrl}/v2/users/${encodeURIComponent(userId)}/apps/${encodeURIComponent(appId)}/models/${encodeURIComponent(modelId)}${version}/outputs`;
}

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));
const round4 = (n) => Math.round(n * 10_000) / 10_000;

/** Converts a Clarifai response into our face list, largest face first. */
export function parseClarifaiResponse(json) {
  if (json?.status?.code !== SUCCESS) {
    const description = json?.status?.details || json?.status?.description || 'unknown error';
    throw new DetectorError(`Face detection failed: ${description}`);
  }
  const output = json.outputs?.[0];
  if (output?.status && output.status.code !== SUCCESS) {
    throw new DetectorError(`Face detection failed: ${output.status.description ?? 'image could not be processed'}`, 422);
  }
  const regions = output?.data?.regions ?? [];
  return regions
    .map((region) => {
      const box = region.region_info?.bounding_box ?? {};
      const confidence = region.value ?? region.data?.concepts?.[0]?.value ?? null;
      return {
        box: {
          top: round4(clamp01(box.top_row)),
          left: round4(clamp01(box.left_col)),
          bottom: round4(clamp01(box.bottom_row)),
          right: round4(clamp01(box.right_col)),
        },
        confidence: confidence === null ? null : round4(confidence),
      };
    })
    .filter((f) => f.box.bottom > f.box.top && f.box.right > f.box.left)
    .sort((a, b) => area(b.box) - area(a.box));
}

const area = (box) => (box.bottom - box.top) * (box.right - box.left);

export function createClarifaiDetector(options, fetchImpl = globalThis.fetch) {
  const url = clarifaiUrl(options);
  return {
    name: 'clarifai',
    async detect(image) {
      const body = JSON.stringify({
        inputs: [{ data: { image: image.url ? { url: image.url } : { base64: image.buffer.toString('base64') } } }],
      });
      let response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: { Authorization: `Key ${options.pat}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body,
          signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
        });
      } catch (error) {
        const reason = error?.name === 'TimeoutError' ? 'timed out' : 'is unreachable';
        throw new DetectorError(`The face detection service ${reason}. Try again shortly.`, 503);
      }
      let json;
      try {
        json = await response.json();
      } catch {
        throw new DetectorError(`Face detection service returned HTTP ${response.status}`);
      }
      return parseClarifaiResponse(json);
    },
  };
}
