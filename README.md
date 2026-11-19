# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and a caption into poster-style cover art — the multi-panel look with bold lettering and a sunset or neon colour grade — exported as a PNG to share.

Pick a layout (one photo, hero + two, three panels, slanted panels with angled dividers, or a four-panel grid), drop your own photos into the panels or use the built-in samples, drag to crop and position each photo, edit the title and subtitle, choose a colour grade, and export in 1080 × 1080, 1080 × 1350 or 1920 × 1080. Everything runs locally in the browser: no network request, no upload, no account. The display fonts (Anton and Bebas Neue, both SIL Open Font License) ship under `app/fonts/`.

## What's new in this version

- **Slanted panels**: a new layout whose dividers run at an angle, plus crisp light edges around every panel, for the classic cover-collage feel.
- **A richer grade**: a retro sun disc with horizontal stripe cuts for the warm grades, a deeper multi-stop sunset wash over the panels, and a whisper of film grain and halftone so the export reads as print, not screenshot.
- **Stronger lettering**: the title now stacks a soft drop shadow, an accent offset, a heavy outline and a two-stop gradient fill, and the subtitle gains a rules-and-diamond flourish.
- **One-click looks**: three curated presets — Key Art, Neon Portrait and Golden Grid — that set layout, grade, size, caption and photos in a single click.
- **Two new sample photos**, made with an image model for this project: a retro convertible on a deco boulevard at sunset, and a pastel lifeguard tower.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=qz2ckkv2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
