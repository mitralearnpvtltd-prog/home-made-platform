import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';

let loadedPath: string | null = null;

/**
 * Resolve apps/api/.env regardless of process.cwd() (monorepo root vs apps/api).
 * Nest ConfigModule uses relative envFilePath and lets process.env win over the
 * file; the standalone auth script reads the file only. Prefer the file so local
 * sandbox credentials stay consistent.
 */
export function resolveApiEnvCandidates(): string[] {
  return [
    join(__dirname, '..', '..', '.env'), // dist/config → apps/api/.env
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps', 'api', '.env'),
  ];
}

export function loadApiEnvFile(options?: { override?: boolean }): string | null {
  if (loadedPath) {
    return loadedPath;
  }

  const override = options?.override ?? true;
  for (const path of resolveApiEnvCandidates()) {
    if (!existsSync(path)) {
      continue;
    }

    const parsed = parse(readFileSync(path));
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') {
        continue;
      }
      if (override || process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    loadedPath = path;
    return path;
  }

  return null;
}

export function getLoadedApiEnvPath(): string | null {
  return loadedPath;
}
