// Sunset Cover Studio — the render engine. drawCover paints one cover from
// the editor state onto any 2D context: polygon panels with angled dividers,
// a cover-fit photo per panel, the grade's multi-stop wash, a striped retro
// sun or neon rings in the sky, a whisper of seeded grain and halftone, and
// the layered caption. It is pure drawing — same state in, same pixels out.

import { GRADES, panelCount, mulberry32 } from './state.js';

// ---------------------------------------------------------------- geometry

function shrinkToCentroid(poly, px) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  return poly.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const pull = Math.min(px, d * 0.4);
    return [x - (dx / d) * pull, y - (dy / d) * pull];
  });
}

// The panel polygons of a layout on a w × h canvas. The slanted trio leans
// its dividers — the top of each divider sits right of its foot — which is
// what gives the cover its key-art energy. Multi-panel layouts are pulled a
// few pixels toward each panel's centroid, opening the crisp gutters the
// edge strokes then light up.
export function panelPolys(layoutId, w, h) {
  let polys;
  if (layoutId === 'hero') {
    const x = 0.58 * w;
    const y = 0.5 * h;
    polys = [
      [[0, 0], [x, 0], [x, h], [0, h]],
      [[x, 0], [w, 0], [w, y], [x, y]],
      [[x, y], [w, y], [w, h], [x, h]],
    ];
  } else if (layoutId === 'trio') {
    const a = w / 3;
    polys = [0, 1, 2].map((i) => [[i * a, 0], [(i + 1) * a, 0], [(i + 1) * a, h], [i * a, h]]);
  } else if (layoutId === 'slant') {
    const t1 = 0.37 * w;
    const b1 = 0.3 * w;
    const t2 = 0.69 * w;
    const b2 = 0.62 * w;
    polys = [
      [[0, 0], [t1, 0], [b1, h], [0, h]],
      [[t1, 0], [t2, 0], [b2, h], [b1, h]],
      [[t2, 0], [w, 0], [w, h], [b2, h]],
    ];
  } else if (layoutId === 'grid') {
    const x = 0.5 * w;
    const y = 0.5 * h;
    polys = [
      [[0, 0], [x, 0], [x, y], [0, y]],
      [[x, 0], [w, 0], [w, y], [x, y]],
      [[0, y], [x, y], [x, h], [0, h]],
      [[x, y], [w, y], [w, h], [x, h]],
    ];
  } else {
    polys = [[[0, 0], [w, 0], [w, h], [0, h]]];
  }
  if (polys.length === 1) return polys;
  const gutter = Math.max(3, Math.min(w, h) * 0.006);
  return polys.map((poly) => shrinkToCentroid(poly, gutter));
}

export function polyBBox(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function tracePoly(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

// ---------------------------------------------------------------- the photo

function drawPanelPhoto(ctx, img, panel, poly) {
  const box = polyBBox(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * panel.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const rangeX = Math.max(0, (dw - box.w) / 2);
    const rangeY = Math.max(0, (dh - box.h) / 2);
    const dx = box.x + box.w / 2 - dw / 2 + panel.ox * rangeX;
    const dy = box.y + box.h / 2 - dh / 2 + panel.oy * rangeY;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    grad.addColorStop(0, '#3b2d5c');
    grad.addColorStop(1, '#131022');
    ctx.fillStyle = grad;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- sky marks

// The retro sun: a gradient disc drawn on a scratch canvas, its lower half
// cut by horizontal stripes that thicken as they descend, then composited
// over the panels so the stripes reveal the art beneath.
function drawStripedSun(ctx, w, h, grade) {
  const r = Math.min(w, h) * 0.17;
  const cx = w * 0.74;
  const cy = h * 0.27;
  const scratch = document.createElement('canvas');
  scratch.width = Math.ceil(r * 2);
  scratch.height = Math.ceil(r * 2);
  const s = scratch.getContext('2d');
  const grad = s.createLinearGradient(0, 0, 0, r * 2);
  grade.sunStops.forEach((stop, i) => grad.addColorStop(i / (grade.sunStops.length - 1), stop));
  s.fillStyle = grad;
  s.beginPath();
  s.arc(r, r, r, 0, Math.PI * 2);
  s.fill();
  s.globalCompositeOperation = 'destination-out';
  let y = r * 1.04;
  let band = r * 0.035;
  let gap = r * 0.11;
  while (y < r * 2) {
    s.fillRect(0, y, r * 2, band);
    y += band + gap;
    band *= 1.45;
    gap *= 0.86;
  }
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(scratch, cx - r, cy - r);
  ctx.restore();
}

function drawNeonRings(ctx, w, h, grade) {
  const cx = w * 0.76;
  const cy = h * 0.24;
  const base = Math.min(w, h);
  ctx.save();
  grade.sunStops.forEach((stop, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, base * (0.055 + i * 0.038), 0, Math.PI * 2);
    ctx.strokeStyle = stop;
    ctx.globalAlpha = 0.85 - i * 0.22;
    ctx.lineWidth = Math.max(2, base * 0.006);
    ctx.shadowColor = stop;
    ctx.shadowBlur = base * 0.03;
    ctx.stroke();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- texture

let grainTile = null;

// A 256 × 256 tile of seeded noise, built once. Tiling it keeps the grain
// identical on every render of every size — deterministic, no Math.random.
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const t = tile.getContext('2d');
  const data = t.createImageData(256, 256);
  const rng = mulberry32(0x5eed);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  t.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

function drawTexture(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.05;
  const pattern = ctx.createPattern(getGrainTile(), 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
  // A fine halftone whisper: one seeded pass of tiny dots, denser toward the
  // foot of the cover, like ink on a printed poster.
  const rng = mulberry32(0xa11f);
  const step = Math.max(6, w * 0.0045);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let row = 0, y = step / 2; y < h; row++, y += step) {
    for (let x = step / 2 + (row % 2) * (step / 2); x < w; x += step) {
      const depth = 0.25 + 0.75 * (y / h);
      ctx.globalAlpha = (0.015 + rng() * 0.03) * depth;
      ctx.beginPath();
      ctx.arc(x, y, step * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- caption

function fitFontPx(ctx, text, px, maxWidth, family) {
  let size = px;
  ctx.font = `400 ${size}px ${family}`;
  const width = ctx.measureText(text).width;
  if (width > maxWidth) size = Math.max(10, Math.floor(size * (maxWidth / width)));
  ctx.font = `400 ${size}px ${family}`;
  return size;
}

function drawCaption(ctx, w, h, state, grade) {
  const title = (state.title || '').trim();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const bandY = state.titlePos === 'top' ? h * 0.15 : state.titlePos === 'middle' ? h * 0.52 : h * 0.845;
  ctx.save();
  ctx.translate(w / 2, bandY);
  ctx.rotate(((state.tilt || 0) * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let titlePx = 0;
  if (title) {
    titlePx = fitFontPx(ctx, title.toUpperCase(), h * 0.118 * (state.titleScale || 1), w * 0.92, 'Anton, sans-serif');
    // Layered treatment: a soft dark drop, an accent offset copy, a heavy
    // outline, then a two-stop gradient fill on top.
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = titlePx * 0.16;
    ctx.shadowOffsetY = titlePx * 0.05;
    ctx.fillStyle = '#14101c';
    ctx.fillText(title.toUpperCase(), 0, 0);
    ctx.restore();
    ctx.fillStyle = grade.accent;
    ctx.fillText(title.toUpperCase(), titlePx * 0.035, titlePx * 0.045);
    if (state.outline) {
      ctx.lineWidth = titlePx * 0.16;
      ctx.strokeStyle = '#171224';
      ctx.lineJoin = 'round';
      ctx.strokeText(title.toUpperCase(), 0, 0);
    }
    const grad = ctx.createLinearGradient(0, -titlePx * 0.8, 0, titlePx * 0.15);
    grad.addColorStop(0, grade.titleTop);
    grad.addColorStop(1, grade.titleBottom);
    ctx.fillStyle = grad;
    ctx.fillText(title.toUpperCase(), 0, 0);
  }
  if (subtitle) {
    const subPx = fitFontPx(ctx, subtitle.toUpperCase(), (titlePx || h * 0.1) * 0.3, w * 0.8, '"Bebas Neue", sans-serif');
    const subY = titlePx * 0.52 + subPx;
    try {
      ctx.letterSpacing = `${Math.round(subPx * 0.32)}px`;
    } catch {
      // Older engines have no letterSpacing; the subtitle still reads fine.
    }
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subPx * 0.3;
    ctx.shadowOffsetY = subPx * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle.toUpperCase(), 0, subY);
    ctx.restore();
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Nothing to reset where it was never set.
    }
    // The flourish: a rule, a diamond, a rule, in the grade's accent.
    const fw = Math.min(w * 0.36, ctx.measureText(subtitle.toUpperCase()).width * 0.9);
    const fy = subY + subPx * 0.62;
    const half = fw / 2;
    const diamond = subPx * 0.16;
    ctx.save();
    ctx.strokeStyle = grade.accent;
    ctx.fillStyle = grade.accent;
    ctx.lineWidth = Math.max(2, subPx * 0.07);
    ctx.beginPath();
    ctx.moveTo(-half, fy);
    ctx.lineTo(-diamond * 1.8, fy);
    ctx.moveTo(diamond * 1.8, fy);
    ctx.lineTo(half, fy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, fy - diamond);
    ctx.lineTo(diamond, fy);
    ctx.lineTo(0, fy + diamond);
    ctx.lineTo(-diamond, fy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the cover

export function drawCover(ctx, w, h, state, images) {
  const grade = GRADES[state.grade] || GRADES.vice;
  const count = panelCount(state.layout);
  const polys = panelPolys(state.layout, w, h);
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    drawPanelPhoto(ctx, images[i], state.panels[i], polys[i]);
  }
  // The grade's multi-stop wash, then the sky mark above it.
  const wash = ctx.createLinearGradient(0, 0, w * 0.25, h);
  for (const [offset, color] of grade.wash) wash.addColorStop(offset, color);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  if (grade.sun === 'disc') drawStripedSun(ctx, w, h, grade);
  if (grade.sun === 'rings') drawNeonRings(ctx, w, h, grade);
  // Crisp light strokes along every panel edge.
  ctx.save();
  ctx.strokeStyle = grade.edge;
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.0035);
  for (let i = 0; i < count; i++) {
    tracePoly(ctx, polys[i]);
    ctx.stroke();
  }
  ctx.restore();
  drawTexture(ctx, w, h);
  // Vignette, then a fine inner frame to finish the poster.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.72);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, `rgba(0, 0, 0, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.0028);
  const inset = Math.min(w, h) * 0.008;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.restore();
  drawCaption(ctx, w, h, state, grade);
}

// Renders the cover onto a fresh canvas at exactly w × h — the export path.
export function renderCoverCanvas(state, images, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state, images);
  return canvas;
}
