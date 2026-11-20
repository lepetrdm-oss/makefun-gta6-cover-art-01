// Sunset Cover Studio — the entry's hand-in program (Node 22, standard
// library only). It stages the finished entry for the scorer: it copies the
// offline app in app/ and the screenshots in screenshots/ from beside this
// file into the output directory, then writes /output/dossier.json with the
// kit's vendored library, which is the summary the judge reads.
//
// All source paths are anchored to this file's own directory — never to the
// process working directory, which the grader does not guarantee.
//
// Run it locally with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps this entry is held to, in the shape buildDossier expects.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

// Start from a clean output directory so a stale screenshot or dossier from
// an earlier run can never ride along with this one.
mkdirSync(out, { recursive: true });
rmSync(join(out, 'app'), { recursive: true, force: true });
rmSync(join(out, 'screenshots'), { recursive: true, force: true });
rmSync(join(out, 'dossier.json'), { force: true });

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// buildDossier returns the dossier itself (bytes); persist it verbatim.
const dossier = buildDossier(out, DOSSIER_CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);
console.log('dossier written to ' + join(out, 'dossier.json'));
