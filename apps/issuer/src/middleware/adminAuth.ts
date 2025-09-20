import type { RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';

export interface BasicAuthCredentials {
  username: string;
  password: string;
}

export const parseBasicAuthHeader = (header?: string | null): BasicAuthCredentials | null => {
  if (!header || !header.startsWith('Basic ')) {
    return null;
  }

  const base64Credentials = header.slice(6).trim();
  const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return null;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return { username, password };
};

const safeCompare = (a: string, b: string) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
};

export const createAdminAuth = (username: string, password: string): RequestHandler => {
  return (req, res, next) => {
    const credentials = parseBasicAuthHeader(req.headers.authorization);

    if (!credentials) {
      res.setHeader('WWW-Authenticate', 'Basic realm="License Admin"');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userOk = safeCompare(credentials.username, username);
    const passOk = safeCompare(credentials.password, password);

    if (!userOk || !passOk) {
      res.setHeader('WWW-Authenticate', 'Basic realm="License Admin"');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
  };
};
