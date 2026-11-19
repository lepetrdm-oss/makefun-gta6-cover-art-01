// Sunset Cover Studio — cover renderer: panels (rectangles or angled
// polygons), photos, the retro sun, the colour grade wash, print texture
// and lettering, drawn on one canvas at the export size. Pure drawing: it
// takes the state and the loaded photos and paints the cover, nothing else.

import { GRADES, LAYOUTS } from './state.js';

// Panel outlines in pixels. Rectangle layouts get a gutter all round each
// panel; polygon layouts carry their gaps in their fractions, so their
// dividers come out angled.
export function panelPolys(state, W, H) {
  const layout = LAYOUTS[state.layout];
  if (layout.polys) {
    return layout.polys.map((poly) => poly.map(([fx, fy]) => [fx * W, fy * H]));
  }
  const g = Math.max(3, Math.round(W * 0.006));
  return layout.panels.map(([fx, fy, fw, fh]) => {
    const x = fx * W + g / 2;
    const y = fy * H + g / 2;
    const w = fw * W - g;
    const h = fh * H - g;
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  });
}

// Bounding boxes of the panels, for hit-testing and the selection outline.
export function panelRects(state, W, H) {
  return panelPolys(state, W, H).map((poly) => {
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  });
}

function tracePoly(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawPanelPhoto(ctx, img, poly, panel, filter) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  ctx.filter = filter;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2 + panel.ox * w;
  const dy = y + (h - dh) / 2 + panel.oy * h;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  ctx.filter = 'none';
}

// Crisp light edges around every panel: the comic-panel border that makes
// a collage of photos read as one poster.
function strokePanelEdges(ctx, polys, grade, W) {
  ctx.save();
  ctx.strokeStyle = grade.panelEdge;
  ctx.lineWidth = Math.max(2, W * 0.0024);
  ctx.lineJoin = 'round';
  for (const poly of polys) {
    tracePoly(ctx, poly);
    ctx.stroke();
  }
  ctx.restore();
}

// The retro sun: a banded disc for the warm grades, its lower half cut by
// horizontal stripes that thicken towards the bottom, drawn on a scratch
// canvas so the cuts are true holes; neon rings for the neon grade.
function drawSun(ctx, grade, W, H) {
  if (grade.sun === 'none') return;
  const cx = W * 0.76;
  const cy = H * 0.21;
  const r = Math.min(W, H) * 0.19;
  ctx.save();
  if (grade.sun === 'ring') {
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = r * 0.35;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowColor = '#ff0080';
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // A warm halo behind the disc.
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.7);
  halo.addColorStop(0, grade.sunStops[1] + 'aa');
  halo.addColorStop(1, grade.sunStops[3] + '00');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4);
  ctx.globalCompositeOperation = 'source-over';

  const size = Math.ceil(r * 2);
  const disc = document.createElement('canvas');
  disc.width = size;
  disc.height = size;
  const d = disc.getContext('2d');
  const fill = d.createLinearGradient(0, 0, 0, size);
  const stops = grade.sunStops;
  fill.addColorStop(0, stops[0]);
  fill.addColorStop(0.38, stops[1]);
  fill.addColorStop(0.72, stops[2]);
  fill.addColorStop(1, stops[3]);
  d.fillStyle = fill;
  d.beginPath();
  d.arc(r, r, r, 0, Math.PI * 2);
  d.fill();
  // Cut the stripes: thin at the middle, thick at the bottom.
  d.globalCompositeOperation = 'destination-out';
  let y = size * 0.56;
  let band = size * 0.014;
  while (y < size) {
    d.fillRect(0, y, size, band);
    y += band + size * 0.052;
    band *= 1.6;
  }
  ctx.globalAlpha = 0.96;
  ctx.drawImage(disc, cx - r, cy - r);
  ctx.restore();
}

function applyGrade(ctx, grade, W, H) {
  // The sunset wash: a deep multi-stop gradient laid over the panels so
  // separate photos share one dusk.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  for (const [stop, color] of grade.wash) wash.addColorStop(stop, color);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  const top = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  top.addColorStop(0, grade.topTint);
  top.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.45);

  const bottom = ctx.createLinearGradient(0, H * 0.55, 0, H);
  bottom.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottom.addColorStop(1, grade.bottomTint);
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  // A soft vignette pulls the eye to the middle of the poster.
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, 'rgba(10, 0, 20, 0)');
  vig.addColorStop(1, 'rgba(10, 0, 20, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// A small deterministic random source, so the grain is the same on every
// render and every export of the same cover.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainPattern = null;
function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 180;
  tile.height = 180;
  const t = tile.getContext('2d');
  const img = t.createImageData(180, 180);
  const rnd = mulberry32(0x5eed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

let halftonePattern = null;
function getHalftonePattern(ctx) {
  if (halftonePattern) return halftonePattern;
  const tile = document.createElement('canvas');
  tile.width = 13;
  tile.height = 13;
  const t = tile.getContext('2d');
  t.fillStyle = '#000000';
  t.beginPath();
  t.arc(6.5, 6.5, 2.0, 0, Math.PI * 2);
  t.fill();
  halftonePattern = ctx.createPattern(tile, 'repeat');
  return halftonePattern;
}

// Print texture over the graded art: a whisper of film grain and a fine
// halftone dot, the things that make a screen image feel like a poster.
function applyTexture(ctx, W, H) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = getGrainPattern(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = getHalftonePattern(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Split a title into lines that fit the width, then shrink the font until
// the longest line fits.
function wrapTitle(ctx, title, maxWidth, startPx, family) {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  let px = startPx;
  let lines = [];
  while (px > startPx * 0.4) {
    ctx.font = `${px}px ${family}`;
    lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 3 && Math.max(...lines.map((l) => ctx.measureText(l).width)) <= maxWidth) {
      return { lines, px };
    }
    px = Math.round(px * 0.92);
  }
  ctx.font = `${px}px ${family}`;
  return { lines, px };
}

function drawTitleBlock(ctx, state, grade, W, H) {
  const family = "Anton, 'Arial Narrow', sans-serif";
  const maxWidth = W * 0.9;
  const startPx = W * 0.115 * state.titleSize;
  const { lines, px } = wrapTitle(ctx, state.title || 'UNTITLED', maxWidth, startPx, family);
  const lineHeight = px * 0.94;
  const subPx = Math.max(14, Math.round(px * 0.3));
  const gap = px * 0.22;
  const barH = Math.max(4, Math.round(px * 0.055));
  const flourishH = subPx * 0.8;
  const blockH = barH + gap + lines.length * lineHeight + gap * 0.6 + subPx + gap * 0.55 + flourishH;

  let top;
  if (state.titlePos === 'top') top = H * 0.05;
  else if (state.titlePos === 'middle') top = (H - blockH) / 2;
  else top = H - H * 0.05 - blockH;

  const cx = W / 2;
  const tilt = (state.tilt * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, top + blockH / 2);
  ctx.rotate(tilt);
  ctx.translate(-cx, -(top + blockH / 2));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Accent bar above the title.
  const barW = Math.min(maxWidth * 0.52, W * 0.42);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(cx - barW / 2, top, barW, barH);

  // The title itself: layered hard shadows (a soft dark drop, then the
  // accent offset), a heavy dark outline, and a two-stop gradient fill —
  // the stacked print look of poster lettering.
  const titleY = top + barH + gap + lineHeight / 2;
  ctx.font = `${px}px ${family}`;
  lines.forEach((line, i) => {
    const y = titleY + i * lineHeight;
    ctx.fillStyle = 'rgba(12, 0, 24, 0.5)';
    ctx.fillText(line, cx + px * 0.058, y + px * 0.064);
    ctx.fillStyle = grade.accent;
    ctx.fillText(line, cx + px * 0.04, y + px * 0.045);
    if (state.outline) {
      ctx.lineWidth = Math.max(3, px * 0.09);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = grade.titleStroke;
      ctx.strokeText(line, cx, y);
    }
    const fill = ctx.createLinearGradient(0, y - px / 2, 0, y + px / 2);
    fill.addColorStop(0, grade.titleFill);
    fill.addColorStop(0.55, grade.titleFill);
    fill.addColorStop(1, grade.titleFill2);
    ctx.fillStyle = fill;
    ctx.fillText(line, cx, y);
  });

  // The subtitle, letter-spaced, flanked by accent rules.
  const subY = top + barH + gap + lines.length * lineHeight + gap * 0.6 + subPx / 2;
  const subFont = `'Bebas Neue', 'Arial Narrow', sans-serif`;
  ctx.font = `${subPx}px ${subFont}`;
  try {
    ctx.letterSpacing = `${Math.round(subPx * 0.22)}px`;
  } catch {
    // Older browsers ignore letter spacing; the subtitle still draws.
  }
  const subText = (state.subtitle || '').toUpperCase();
  const subW = ctx.measureText(subText).width;
  const ruleGap = subPx * 0.7;
  const ruleLen = Math.min(W * 0.08, subPx * 2.2);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, subPx * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx - subW / 2 - ruleGap - ruleLen, subY);
  ctx.lineTo(cx - subW / 2 - ruleGap, subY);
  ctx.moveTo(cx + subW / 2 + ruleGap, subY);
  ctx.lineTo(cx + subW / 2 + ruleGap + ruleLen, subY);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(subText, cx, subY);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // Ignore.
  }

  // The flourish under the subtitle: two accent rules and a diamond.
  const flY = subY + subPx / 2 + gap * 0.55 + flourishH / 2;
  const flHalf = Math.min(maxWidth * 0.2, subW * 0.36 + ruleLen);
  const diamond = subPx * 0.2;
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, subPx * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx - flHalf, flY);
  ctx.lineTo(cx - diamond * 1.9, flY);
  ctx.moveTo(cx + diamond * 1.9, flY);
  ctx.lineTo(cx + flHalf, flY);
  ctx.stroke();
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.moveTo(cx, flY - diamond);
  ctx.lineTo(cx + diamond, flY);
  ctx.lineTo(cx, flY + diamond);
  ctx.lineTo(cx - diamond, flY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Paint the whole cover on ctx at W by H pixels. images must be the loaded
// photos for state.panels, in the same order.
export function drawCover(ctx, state, images, W, H) {
  const grade = GRADES[state.grade] || GRADES.vice;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, W, H);

  const polys = panelPolys(state, W, H);
  polys.forEach((poly, i) => {
    const img = images[i];
    if (!img) return;
    drawPanelPhoto(ctx, img, poly, state.panels[i], grade.photoFilter);
  });
  strokePanelEdges(ctx, polys, grade, W);

  drawSun(ctx, grade, W, H);
  applyGrade(ctx, grade, W, H);
  applyTexture(ctx, W, H);

  // A faint inner frame gives the poster its edge.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeRect(W * 0.008, H * 0.008, W * 0.984, H * 0.984);

  drawTitleBlock(ctx, state, grade, W, H);
}
