// Sunset Cover Studio — the hand-in program (v2 rebuild).
//
// Copies app/ and screenshots/ into the output directory and writes the
// entry's dossier.json with buildDossier from the kit's vendor library,
// under the bounty's caps. Node 22, standard library only; MAKEFUN_OUTPUT_DIR
// stands in for /output outside the grader. The run is deterministic: the
// same repository writes the same bytes every time.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

// The bounty's dossier caps, factored into one named constant: the text
// budget shapes the dossier's bytes; the rest only refuse an entry that
// grows past them, exactly as the scorer's own gate would.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync('app', join(outputDir, 'app'), { recursive: true });
cpSync('screenshots', join(outputDir, 'screenshots'), { recursive: true });
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
