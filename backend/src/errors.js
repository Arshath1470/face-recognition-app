export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Sign in to continue') => new HttpError(401, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);

/** Turns a zod error into { field: message } for the UI. */
export function fieldErrors(zodError) {
  const errors = {};
  for (const issue of zodError.issues) {
    const field = issue.path.join('.') || 'body';
    errors[field] ??= issue.message;
  }
  return errors;
}

export function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (error, req, res, next) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'That image is too large. Use one under the size limit.' });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message, ...(error.details ? { fields: error.details } : {}) });
    }
    logger.error({ err: error }, 'unhandled error');
    return res.status(500).json({ error: 'Something went wrong on our side. Try again in a moment.' });
  };
}
