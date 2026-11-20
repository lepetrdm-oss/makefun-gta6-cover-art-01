// Sunset Cover Studio — dossier builder for the make.fun entry.
// Copies app/ and screenshots/ into the output directory, then writes
// dossier.json there via the kit's buildDossier.
//
// Every source path is anchored to this script's own directory (never to
// the process working directory), so the build works when the grader runs
// `node /bot/main.ts` from any cwd, against a read-only copy of the repo.
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

async function main(): Promise<void> {
  // Start from a clean slate in the output directory.
  for (const name of ['app', 'screenshots', 'dossier.json']) {
    rmSync(join(out, name), { recursive: true, force: true });
  }
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

  const dossier = await buildDossier(out, DOSSIER_CAPS);
  const dossierPath = join(out, 'dossier.json');
  if (!existsSync(dossierPath) && dossier !== undefined) {
    // buildDossier hands back the dossier itself (bytes or text) rather
    // than writing it; persist it verbatim, falling back to JSON for a
    // plain-object return.
    if (typeof dossier === 'string' || dossier instanceof Uint8Array) {
      writeFileSync(dossierPath, dossier);
    } else {
      writeFileSync(dossierPath, JSON.stringify(dossier, null, 2) + '\n');
    }
  }
  console.log(`Sunset Cover Studio: dossier written to ${dossierPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
