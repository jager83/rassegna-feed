// Lettura e scrittura della cartella feed/ di rassegna-feed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback);
export const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

export const readIndex = (feedDir) => readJson(join(feedDir, 'index.json'), []);

export const readVociOf = (feedDir, entries) =>
  entries.flatMap((entry) => readJson(join(feedDir, entry.file), { voci: [] }).voci);
