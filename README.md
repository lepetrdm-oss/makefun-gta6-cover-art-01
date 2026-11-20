# Sunset Cover Studio
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Sunset Cover Studio is a fully offline web app that turns any photo plus a caption into multi-panel GTA-style cover art, ready to export as a PNG. There is no build step and the app makes no network requests: open it, pick a composition, drop in your photos, type your caption, export.

## What it does

- **Five layouts** — One photo, Hero + two, Three panels, a Slanted trio with diagonal polygon dividers, gutters and crisp light edge strokes, and a Four-panel grid.
- **Per-panel photo control** — every panel can use a built-in sample photo or your own upload (file picker or drag-and-drop onto the cover). Drag on the cover to pan the selected panel's photo, zoom with a slider, reset the crop, or push one panel's photo and framing to all panels at once.
- **Four colour grades** — Vice Sunset, Neon Nights, Golden Hour and Noir. Each lays a multi-stop colour wash and a vignette over the panels. Vice Sunset and Golden Hour draw a striped retro sun disc in the sky; Neon Nights draws glowing neon rings instead. A seeded film grain and halftone overlay (deterministic PRNG, no `Math.random`) finishes the print look, so the same setup always renders the same cover.
- **Layered captions** — the title is painted with a soft drop shadow, an accent-colour offset copy, a heavy outline and a two-stop gradient fill in Anton; the subtitle is letter-spaced Bebas Neue with a line-and-diamond flourish. Title and subtitle text, size, vertical position and tilt are all editable.
- **One-click Looks** — Key Art (slanted trio, Vice Sunset, wide), Neon Portrait (three panels, Neon Nights, portrait) and Golden Grid (four-panel grid, Golden Hour, square) load a complete composition instantly. The editor opens on Key Art.
- **PNG export** — one click renders the cover offscreen at exactly 1080×1080, 1080×1350 or 1920×1080 and downloads it.

The Anton and Bebas Neue fonts are vendored under `app/fonts/` with their SIL Open Font License texts, and the sample photos under `app/samples/` are free to use.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a browser.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json`.

<sub>Entered on [make.fun](https://make.fun/?ref=qz2ckkv2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
