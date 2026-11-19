// Sunset Cover Studio — main.ts (v3 rebuild)
// The hand-in program: copies app/ and screenshots/ into the output
// directory and writes dossier.json with buildDossier from the kit's
// vendor library. Node 22, standard library only; MAKEFUN_OUTPUT_DIR
// stands in for /output outside the grader.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-app.ts';

// The bounty's dossier caps, factored into one named constant: the text
// cap shapes the dossier's bytes, the rest refuse oversize input exactly
// where the scorer would.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const root = new URL('.', import.meta.url).pathname;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(`${root}app`, `${outDir}/app`, { recursive: true });
cpSync(`${root}screenshots`, `${outDir}/screenshots`, { recursive: true });
writeFileSync(`${outDir}/dossier.json`, buildDossier(outDir, DOSSIER_CAPS));

console.log(`handed in the app: ${outDir}/app, ${outDir}/screenshots, ${outDir}/dossier.json`);
