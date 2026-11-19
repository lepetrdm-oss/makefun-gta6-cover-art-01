# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Sunset Cover Studio turns any photo and a caption into multi-panel cover art in the poster style of a sun-drenched crime saga: angled panel dividers, a retro sun cut with horizontal stripes, neon and sunset colour grades, and heavy display lettering — exported as a PNG in the common post sizes.

## What it does

- **Five layouts** — One photo, Hero + two, Three panels, a **Slanted trio** with diagonal polygon dividers and crisp light edge strokes, and a Four-panel grid.
- **Any photo, every panel** — five built-in sample photos (two from the kit, three made with an image model), or your own: upload per panel, drag a photo file onto a panel, drag to pan, zoom, reset the crop, or fill all panels with one photo.
- **Four colour grades** — Vice Sunset, Neon Nights, Golden Hour and Noir. Each lays a multi-stop wash over the panels and finishes with a vignette; Vice and Golden draw a striped retro sun disc in the sky, Neon draws glowing rings. A whisper of seeded film grain and halftone gives the export a printed-poster feel, and because the seed is fixed the same cover always renders byte-identically.
- **Layered captions** — the title is drawn with a soft drop shadow, an accent offset, a heavy outline and a two-stop gradient fill (Anton, SIL OFL); the subtitle is letter-spaced (Bebas Neue, SIL OFL) with a rules-and-diamond flourish. Edit the text, size, position and tilt.
- **One-click Looks** — Key Art, Neon Portrait and Golden Grid apply a whole composition (layout, grade, size, caption, photos) in one click. The editor opens on Key Art.
- **One-click export** — a real PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.
- **Fully offline** — static files only, no build step, no network requests; your photos are read on your own machine and never uploaded.

## Run it

```
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` to `out/` and writes `out/dossier.json`.

<sub>Entered on [make.fun](https://make.fun/?ref=qz2ckkv2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
