import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const logRoot = path.join(root, 'match_logs');
const logPattern = /^(\d{4})(?:-(\d{2}))?\.(txt|jpe?g|png)$/i;

async function safeReadDir(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function toWebPath(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

const logsById = new Map();
const seasonDirs = (await safeReadDir(logRoot))
  .filter((entry) => entry.isDirectory() && /^S\d+$/i.test(entry.name))
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

for (const seasonDir of seasonDirs) {
  const season = seasonDir.name.toUpperCase();
  const dir = path.join(logRoot, seasonDir.name);
  const files = await safeReadDir(dir);

  for (const file of files) {
    if (!file.isFile()) continue;
    const match = file.name.match(logPattern);
    if (!match) continue;

    const [, matchId, pageText, ext] = match;
    const filePath = path.join(dir, file.name);
    const item = {
      file: toWebPath(filePath),
      type: ext.toLowerCase() === 'txt' ? 'text' : 'image',
      page: pageText ? Number(pageText) : null,
    };

    if (!logsById.has(matchId)) {
      logsById.set(matchId, {
        matchId: Number(matchId),
        season,
        files: [],
      });
    }
    logsById.get(matchId).files.push(item);
  }
}

const logs = [...logsById.values()]
  .map((row) => ({
    ...row,
    files: row.files.sort((a, b) => (a.page ?? 0) - (b.page ?? 0) || a.file.localeCompare(b.file, 'ko')),
  }))
  .sort((a, b) => a.matchId - b.matchId);

const manifest = {
  generatedAt: new Date().toISOString(),
  totalMatchesWithLogs: logs.length,
  logs,
};

await fs.writeFile(path.join(logRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${logs.length} logged matches to match_logs/manifest.json`);
