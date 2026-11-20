# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lepetrdm-oss/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo — yours or the bundled samples — into
GTA 6-style cover art: a multi-panel poster with bold lettering, a Vice City
grade, and the full chrome of a cinema one-sheet. Everything runs locally in
the browser; no photo ever leaves the device.

**Cast billing on every panel.** Each panel wears a slanted two-line tag: the
character's name in Anton caps (Marisol Vega, Elias Crowe, Juno Park…) over
their role in Bebas Neue (The Driver, The Boss, The Getaway…). Names and roles
are editable per panel, and tags automatically sit opposite the face so they
never cover it.

**A real poster frame.** The masthead carries three five-star pull-quotes
from three fictional papers, a VOL. 1 tag, a gold starburst "Original Cover
Art" seal, a deterministic barcode, a tiny billing block, and a COMING SOON
strip. Two frame styles: the overlaid **Sunset** frame, and **Premiere** — a
black-and-gold gala one-sheet with deep black bands, thin gold rules, and an
ivory title.

**Face-aware auto-framing.** Bundled photos carry focal-point metadata and
uploads get a focal point from a lightweight saliency scan (skin-tone and
contrast weighting), so the default crop centres the face in every panel;
drag to pan and scroll to zoom from there.

**Seven layouts** — One photo, Hero + two, Three panels, Slanted trio,
Four-panel grid, Hero collage (hero + 2×2 + wide strip), and the diagonal
Splash — and **five grades**: Vice Sunset, Neon Nights, Golden Hour, Noir,
and Heatwave, each with a multi-stop wash, vignette, seeded film grain and
halftone, plus a striped retro sun or neon rings parked in open sky. The
Anton title is layered (shadow, accent offset, heavy outline, chrome
gradient) with an optional distressed print texture, so it reads as printed
ink, not web text. Export a finished PNG at 1080×1080, 1080×1350, or
1920×1080.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Pick a look, swap photos per panel (or
upload your own), edit the cast names, quotes and title, and export.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` there with the kit's `buildDossier`.

<sub>Entered on [make.fun](https://make.fun/?ref=qz2ckkv2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
