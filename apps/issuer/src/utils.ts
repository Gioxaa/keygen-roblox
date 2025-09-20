import type { Request } from 'express';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const parseCorsOrigins = (origins: string) => {
  if (!origins || origins.trim() === '' || origins.trim() === '*') {
    return '*';
  }

  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

export const getClientIp = (req: Request): string | null => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? null;
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0]?.trim() ?? null;
  }

  return req.socket.remoteAddress ?? null;
};

export const unixSeconds = (date: Date | number = Date.now()): number => {
  if (typeof date === 'number') {
    return Math.floor(date / 1000);
  }

  return Math.floor(date.getTime() / 1000);
};

export const loadKeyFile = async (path: string) => {
  const resolved = resolve(path);
  return readFile(resolved, 'utf8');
};
