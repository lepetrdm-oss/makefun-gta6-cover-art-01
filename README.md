# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Sunset Cover Studio is an offline web app that turns your photos and a caption into GTA-style multi-panel cover art, exported as a PNG at real post sizes (1080×1080, 1080×1350, 1920×1080). No build step, no network: open the page, load a photo, make a cover.

## What it does

- **Five layouts** — One photo, Hero + two, Three panels, a **Slanted trio** with angled diagonal dividers, crisp light panel edges and built-in gutters, and a Four-panel grid.
- **Four colour grades** — Vice Sunset, Neon Nights, Golden Hour and Noir. Each lays a multi-stop colour wash and a vignette over the panels; Vice and Golden Hour draw a **retro sun disc cut by horizontal stripes** that thicken towards the bottom, Neon draws glowing rings instead, and every export carries a whisper of seeded film grain and halftone print texture.
- **Any photo, every panel** — five bundled samples (two from the kit starter, three made with an image model for this app), or upload your own per panel by file picker or drag-and-drop. Drag to pan, zoom with a slider, reset the crop, or use one photo in all panels at once.
- **Caption editor** — a layered title in Anton (soft dark drop, accent offset, heavy outline, two-stop gradient fill), a letter-spaced Bebas Neue subtitle with a rules-and-diamond flourish, plus size, position (top / middle / bottom), tilt and outline controls.
- **Looks presets** — one-click Key Art, Neon Portrait and Golden Grid compositions; the app opens on Key Art, its strongest cover.
- **Deterministic scenes** — `?shot=cover|editor` URLs with preset/layout/grade/size/title/photos parameters reproduce an exact cover or editor view, which is how the screenshots were taken.

Fonts are Anton and Bebas Neue, vendored under `app/fonts/` with their SIL Open Font License 1.1 texts. Everything here is original — no Rockstar logos, artwork or fonts.

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
