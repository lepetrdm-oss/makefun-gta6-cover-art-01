// Sunset Cover Studio — the entry's hand-in program (Node 22, standard
// library only). It stages the finished entry for the scorer: it copies the
// offline app in app/ and the screenshots in screenshots/ from beside this
// file into the output directory, then writes /output/dossier.json with the
// kit's vendored library, which is the summary the judge reads.
//
// Version 2 of the studio: slanted panel layouts and a retro striped sun in
// the renderer, two new sample photos, and one-click looks. The hand-in is
// unchanged — same app/, same screenshots/, same dossier.
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

// The scorer's caps for this bounty: the text cap shapes the dossier's
// bytes, and the rest refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files in all; or a path under app/ over 1000 bytes. app/ shares the
// platform's own /output cap (1000 entries, 64 MiB) with screenshots/ and
// dossier.json, so the caps below leave it room.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, DOSSIER_CAPS),
);
