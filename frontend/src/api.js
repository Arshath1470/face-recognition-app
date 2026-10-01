export class ApiError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** fetch wrapper: JSON bodies by default, FormData passed through untouched. */
export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'FaceFinder could not be reached. Check your connection and try again.');
  }

  if (response.status === 204) return null;
  let data = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON (e.g. a proxy error page)
  }
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? `Request failed (${response.status})`, data?.fields ?? null);
  }
  return data;
}
