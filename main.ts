// Sunset Cover Studio — hand-in builder. Copies the app and the
// screenshots into the directory named by MAKEFUN_OUTPUT_DIR and
// writes the entry's dossier.json there with the kit's buildDossier.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

// The caps this entry is held to, in the shape buildDossier expects.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

const out = process.env.MAKEFUN_OUTPUT_DIR;
if (!out) {
  throw new Error('MAKEFUN_OUTPUT_DIR is not set');
}

mkdirSync(out, { recursive: true });
cpSync('app', join(out, 'app'), { recursive: true });
cpSync('screenshots', join(out, 'screenshots'), { recursive: true });
writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));
console.log('dossier written to ' + join(out, 'dossier.json'));
