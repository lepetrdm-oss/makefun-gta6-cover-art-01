// Sunset Cover Studio — the cover renderer. Pure canvas drawing:
// layout geometry, graded photo panels, sky decorations, seeded grain
// and halftone, and the layered Anton / Bebas Neue typography.
// Everything here is deterministic: same state in, same pixels out.
import { gradeById, mulberry32, seedFromString } from './state.js';

const GUTTER_FRAC = 0.012; // gutter width as a fraction of cover width

// ---------------------------------------------------------------- geometry
// A panel shape is a polygon: an array of {x, y} points, clockwise.
export function panelShapes(layout, W, H) {
  const g = Math.max(6, Math.round(W * GUTTER_FRAC));
  const rect = (x, y, w, h) => [
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
  ];
  switch (layout) {
    case 'one':
      return [rect(0, 0, W, H)];
    case 'hero': {
      const hw = Math.round(W * 0.58);
      const rh = (H - g) / 2;
      return [
        rect(0, 0, hw, H),
        rect(hw + g, 0, W - hw - g, rh),
        rect(hw + g, rh + g, W - hw - g, H - rh - g),
      ];
    }
    case 'trio': {
      const w = (W - 2 * g) / 3;
      return [0, 1, 2].map((i) => rect(Math.round(i * (w + g)), 0, w, H));
    }
    case 'slanted': {
      // Three parallelograms leaning right, gutters between them.
      const slant = W * 0.085;
      const x0 = W / 3, x1 = (2 * W) / 3;
      return [
        [{ x: 0, y: 0 }, { x: x0 + slant, y: 0 }, { x: x0 - slant, y: H }, { x: 0, y: H }],
        [{ x: x0 + slant + g, y: 0 }, { x: x1 + slant, y: 0 }, { x: x1 - slant, y: H }, { x: x0 - slant + g, y: H }],
        [{ x: x1 + slant + g, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: x1 - slant + g, y: H }],
      ];
    }
    case 'grid': {
      const w = (W - g) / 2, h = (H - g) / 2;
      return [
        rect(0, 0, w, h), rect(w + g, 0, W - w - g, h),
        rect(0, h + g, w, H - h - g), rect(w + g, h + g, W - w - g, H - h - g),
      ];
    }
    default:
      return [rect(0, 0, W, H)];
  }
}

export function shapeBounds(points) {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function pointInShape(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function tracePath(ctx, points) {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

// Cover-fit placement of an image inside a shape's bounding box,
// honouring the panel's zoom and focal point (panX / panY in 0..1).
export function imagePlacement(img, bounds, panel) {
  const scale = Math.max(bounds.w / img.width, bounds.h / img.height) * (panel.zoom || 1);
  const dw = img.width * scale, dh = img.height * scale;
  return {
    dx: bounds.x + (bounds.w - dw) * (panel.panX ?? 0.5),
    dy: bounds.y + (bounds.h - dh) * (panel.panY ?? 0.5),
    dw, dh,
  };
}

// ------------------------------------------------------------- decorations
// Striped retro sun, rendered to an offscreen canvas first so the stripe
// cut-outs never erase the photo underneath.
function sunCanvas(r) {
  const d = Math.ceil(r * 2);
  const c = document.createElement('canvas');
  c.width = d; c.height = d;
  const x = c.getContext('2d');
  const grad = x.createLinearGradient(0, 0, 0, d);
  grad.addColorStop(0, '#ffd23f');
  grad.addColorStop(0.55, '#ff7b39');
  grad.addColorStop(1, '#ff2e88');
  x.fillStyle = grad;
  x.beginPath(); x.arc(r, r, r, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'destination-out';
  let y = r + r * 0.06, band = r * 0.045;
  while (y < r * 2) {
    x.fillRect(0, y, d, band);
    y += band + r * 0.17;
    band *= 1.5;
  }
  return c;
}

function drawSun(ctx, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(255,110,64,0.85)';
  ctx.shadowBlur = r * 0.35;
  const c = sunCanvas(r);
  ctx.drawImage(c, cx - r, cy - r);
  ctx.restore();
}

function drawRings(ctx, cx, cy, r) {
  ctx.save();
  ctx.lineWidth = Math.max(2, r * 0.07);
  const rings = [
    [1.0, '#00e5ff'], [0.78, '#ff2e88'], [0.56, '#ffe14d'],
  ];
  for (const [f, colour] of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
    ctx.strokeStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = r * 0.22;
    ctx.stroke();
  }
  ctx.restore();
}

function drawDecoration(ctx, shape, grade, decoPanel, index) {
  if (index !== decoPanel || grade.decoration === 'none') return;
  const b = shapeBounds(shape);
  const cx = b.x + b.w * 0.5;
  const cy = b.y + b.h * 0.30; // open sky, upper third of the panel
  const r = Math.min(b.w, b.h) * 0.30;
  if (grade.decoration === 'sun') drawSun(ctx, cx, cy, r);
  else if (grade.decoration === 'rings') drawRings(ctx, cx, cy, r);
}

// ------------------------------------------------------------ grain & dots
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');
  const img = x.createImageData(S, S);
  const rand = mulberry32(0x5eed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

function drawGrain(ctx, W, H, state) {
  // Seeded offset so the tile phase is fixed for a given cover.
  const rand = mulberry32(seedFromString(`${state.title}|${W}x${H}`));
  const ox = Math.floor(rand() * 256), oy = Math.floor(rand() * 256);
  const pattern = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

function drawHalftone(ctx, W, H) {
  // Regular dot grid fading into the top and bottom edges — positions are
  // a fixed grid, so this is fully deterministic.
  ctx.save();
  ctx.fillStyle = 'rgba(8,2,20,0.20)';
  const gap = Math.max(14, W * 0.016);
  const bandH = H * 0.16;
  for (let row = 0; row * gap < bandH; row++) {
    const fade = 1 - (row * gap) / bandH;
    const r = (gap * 0.30) * fade;
    if (r < 0.4) continue;
    for (let cx = gap / 2; cx < W; cx += gap) {
      ctx.beginPath(); ctx.arc(cx, row * gap + gap / 2, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, H - (row * gap + gap / 2), r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// --------------------------------------------------------------- typography
function drawSubtitle(ctx, W, cy, state, grade, titleSize) {
  const text = (state.subtitle || '').trim();
  if (!text) return;
  const size = Math.max(14, titleSize * 0.30);
  ctx.save();
  ctx.font = `${size}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(size * 0.22)}px`; } catch { /* older engines */ }
  const tw = ctx.measureText(text).width + size * 0.22 * text.length;
  const gap = size * 0.55;
  const lineLen = Math.min(W * 0.16, tw * 0.5);
  const diamond = size * 0.30;
  const midY = cy;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.18;
  ctx.fillText(text, W / 2, midY);
  ctx.shadowBlur = 0;
  // line – diamond – line flourish on both sides
  ctx.strokeStyle = grade.accent;
  ctx.fillStyle = grade.accent;
  ctx.lineWidth = Math.max(2, size * 0.09);
  const inner = tw / 2 + gap;
  const outer = inner + lineLen;
  for (const dir of [-1, 1]) {
    const x1 = W / 2 + dir * inner, x2 = W / 2 + dir * outer;
    ctx.beginPath(); ctx.moveTo(x1, midY); ctx.lineTo(x2, midY); ctx.stroke();
    const dx = W / 2 + dir * (outer + gap * 0.8);
    ctx.beginPath();
    ctx.moveTo(dx, midY - diamond);
    ctx.lineTo(dx + diamond, midY);
    ctx.lineTo(dx, midY + diamond);
    ctx.lineTo(dx - diamond, midY);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawTitleBlock(ctx, W, H, state, grade) {
  const title = (state.title || '').trim().toUpperCase();
  if (!title) return;
  // Soft dark band along the bottom so the caption always reads.
  const band = ctx.createLinearGradient(0, H * 0.62, 0, H);
  band.addColorStop(0, 'rgba(10,2,24,0)');
  band.addColorStop(1, 'rgba(10,2,24,0.60)');
  ctx.fillStyle = band;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  let size = H * 0.155;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => { ctx.font = `${s}px Anton, sans-serif`; };
  setFont(size);
  const maxW = W * 0.92;
  const w = ctx.measureText(title).width;
  if (w > maxW) { size = Math.floor(size * (maxW / w)); setFont(size); }
  const cx = W / 2;
  const baseline = H * 0.905;
  // 1 — drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(title, cx + size * 0.045, baseline + size * 0.065);
  // 2 — accent offset copy
  ctx.fillStyle = grade.accent;
  ctx.fillText(title, cx - size * 0.038, baseline - size * 0.038);
  // 3 — heavy outline
  ctx.lineWidth = Math.max(2, size * 0.17);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14041f';
  ctx.strokeText(title, cx, baseline);
  // 4 — two-stop gradient fill
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ffb9dd');
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, baseline);
  ctx.restore();

  drawSubtitle(ctx, W, baseline + size * 0.42, state, grade, size);
}

// ------------------------------------------------------------------- render
// getImage(panel) must return a loaded HTMLImageElement, or null while the
// photo is still loading (a deterministic placeholder is drawn instead).
export function renderCover(ctx, W, H, state, getImage) {
  const grade = gradeById(state.grade);
  // Backdrop the gutters show through.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1b0b33');
  bg.addColorStop(1, '#05030d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const shapes = panelShapes(state.layout, W, H);
  shapes.forEach((shape, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const bounds = shapeBounds(shape);
    ctx.save();
    tracePath(ctx, shape);
    ctx.clip();
    const img = getImage(panel);
    if (img) {
      const p = imagePlacement(img, bounds, panel);
      if (grade.grayscale) ctx.filter = `grayscale(${grade.grayscale})`;
      ctx.drawImage(img, p.dx, p.dy, p.dw, p.dh);
      ctx.filter = 'none';
    } else {
      const ph = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
      ph.addColorStop(0, '#3a165e');
      ph.addColorStop(1, '#12041f');
      ctx.fillStyle = ph;
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    }
    // Multi-stop colour wash, then flat tint.
    const wash = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.h);
    for (const [pos, colour] of grade.stops) wash.addColorStop(pos, colour);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = wash;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grade.tint;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.globalCompositeOperation = 'source-over';
    // Vignette.
    const vg = ctx.createRadialGradient(
      bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, Math.min(bounds.w, bounds.h) * 0.36,
      bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, Math.max(bounds.w, bounds.h) * 0.78,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
    // Light edge stroke around the panel.
    ctx.save();
    tracePath(ctx, shape);
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = Math.max(1.5, W * 0.0022);
    ctx.stroke();
    ctx.restore();
    drawDecoration(ctx, shape, grade, state.decoPanel, i);
  });

  drawHalftone(ctx, W, H);
  drawGrain(ctx, W, H, state);
  drawTitleBlock(ctx, W, H, state, grade);
}
