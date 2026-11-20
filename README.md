# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Sunset Cover Studio turns any photo into a GTA 6-style cover: a multi-panel
poster with bold display lettering, a Vice City colour grade and a striped
retro sun. It runs entirely offline in the browser — no uploads, no server,
no build step.

## What it does

- **Five layouts** — One photo, Hero + two, Three panels, a Slanted trio
  with clip-path polygon panels, gutters and light edge strokes, and a
  Four-panel grid.
- **Per-panel control** — pick one of the five bundled sample photos or
  upload your own, drag to pan, zoom with a slider, reset, or apply one
  panel's photo and framing to every panel at once.
- **Four colour grades** — Vice Sunset, Neon Nights, Golden Hour and Noir,
  each a multi-stop colour wash plus a vignette. Vice and Golden draw a
  striped retro sun over the sky; Neon draws glowing rings instead.
- **Cover typography** — the title is set in Anton with a layered render
  (drop shadow, accent offset, heavy outline, gradient fill); the subtitle
  is set in Bebas Neue with a line–diamond–line flourish. Both fonts are
  open-licensed (OFL) and bundled under `app/fonts/`.
- **Three one-click Looks** — Key Art, Neon Portrait and Golden Grid
  presets that combine a layout, a grade, photos, caption and size.
- **Deterministic finish** — seeded film grain (mulberry32) and a halftone
  dot fade, identical on every render. No randomness, no network calls.
- **PNG export** at 1080×1080, 1080×1350 and 1920×1080 from an offscreen
  canvas, exactly the size you pick.

## Run it

Serve the repository root with the bundled static server (Node 22, no
dependencies):

```sh
node serve.ts
```

Then open <http://localhost:8080/app/index.html>. Or open `app/index.html`
through any static file server — the app itself is plain HTML, CSS and JS
under `app/`.

## Hand it in

`main.ts` builds the entry dossier: it copies `app/` and `screenshots/`
into `$MAKEFUN_OUTPUT_DIR` (default `/output`) and writes `dossier.json`
there with the kit's `buildDossier`. All source paths are anchored to the
script's own directory, so it works from any working directory:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The screenshots in `screenshots/` are real renders of this app (the
`?shot=` scenes in `app/src/shots.js` pose the cover and the editor for
the camera), and `shots.json` records how each one was taken.

<sub>Entered on [make.fun](https://make.fun/?ref=qz2ckkv2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
