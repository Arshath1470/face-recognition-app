import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { unauthorized } from './errors.js';

const BCRYPT_ROUNDS = 11;

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export function issueToken(user, config) {
  return jwt.sign({ name: user.name }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtTtl,
    issuer: 'facefinder',
    algorithm: 'HS256',
  });
}

/** Express middleware: verifies the bearer token and sets req.userId. */
export function requireAuth(config) {
  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(unauthorized());
    try {
      const claims = jwt.verify(token, config.jwtSecret, { issuer: 'facefinder', algorithms: ['HS256'] });
      req.userId = Number.parseInt(claims.sub, 10);
      return next();
    } catch {
      return next(unauthorized('Your session has expired. Sign in again.'));
    }
  };
}
