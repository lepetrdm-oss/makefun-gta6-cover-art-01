// Sunset Cover Studio — the cover renderer. Pure canvas work: given a
// 2d context, an output size, the shared state and the loaded panel
// images, it paints the finished cover. Every random-looking element
// comes from a seeded PRNG, so the same state always paints the same
// pixels — exports are byte-identical between runs.

import { SAMPLES } from './state.js';

// Deterministic PRNG (mulberry32). Render paths never call Math.random.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rect(x, y, w, h) {
  return {
    points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
    box: { x: x, y: y, w: w, h: h },
  };
}

function poly(fracs, W, H) {
  const points = fracs.map(function (p) { return [p[0] * W, p[1] * H]; });
  const xs = points.map(function (p) { return p[0]; });
  const ys = points.map(function (p) { return p[1]; });
  const x0 = Math.min.apply(null, xs);
  const y0 = Math.min.apply(null, ys);
  return {
    points: points,
    box: { x: x0, y: y0, w: Math.max.apply(null, xs) - x0, h: Math.max.apply(null, ys) - y0 },
  };
}

// Panel shapes for each layout. The slanted trio uses diagonal polygon
// dividers; the dark page colour shows through the gaps as gutters.
export function panelShapes(layout, W, H) {
  const g = Math.max(6, W * 0.008);
  if (layout === 'one') {
    return [rect(0, 0, W, H)];
  }
  if (layout === 'hero') {
    const heroW = W * 0.615;
    const sideX = heroW + g;
    const sideW = W - sideX;
    const halfH = (H - g) / 2;
    return [
      rect(0, 0, heroW, H),
      rect(sideX, 0, sideW, halfH),
      rect(sideX, halfH + g, sideW, halfH),
    ];
  }
  if (layout === 'trio') {
    const colW = (W - 2 * g) / 3;
    return [0, 1, 2].map(function (i) { return rect(i * (colW + g), 0, colW, H); });
  }
  if (layout === 'slanted') {
    return [
      poly([[0, 0], [0.355, 0], [0.295, 1], [0, 1]], W, H),
      poly([[0.378, 0], [0.668, 0], [0.608, 1], [0.318, 1]], W, H),
      poly([[0.691, 0], [1, 0], [1, 1], [0.631, 1]], W, H),
    ];
  }
  // grid: four panels, two by two.
  const cellW = (W - g) / 2;
  const cellH = (H - g) / 2;
  return [
    rect(0, 0, cellW, cellH),
    rect(cellW + g, 0, cellW, cellH),
    rect(0, cellH + g, cellW, cellH),
    rect(cellW + g, cellH + g, cellW, cellH),
  ];
}

const WASHES = {
  vice: {
    stops: [[0, 'rgba(255,154,61,0.85)'], [0.45, 'rgba(255,46,136,0.72)'], [1, 'rgba(46,6,84,0.88)']],
    tint: 'rgba(255,84,44,0.10)', accent: '#ff2e88', titleA: '#ffffff', titleB: '#ffd23d',
  },
  neon: {
    stops: [[0, 'rgba(0,229,255,0.78)'], [0.5, 'rgba(123,43,255,0.72)'], [1, 'rgba(255,46,166,0.85)']],
    tint: 'rgba(16,32,140,0.12)', accent: '#00e5ff', titleA: '#ffffff', titleB: '#7df9ff',
  },
  golden: {
    stops: [[0, 'rgba(255,210,61,0.85)'], [0.55, 'rgba(255,138,61,0.72)'], [1, 'rgba(140,32,74,0.88)']],
    tint: 'rgba(255,150,50,0.10)', accent: '#ff8a3d', titleA: '#ffffff', titleB: '#ffe259',
  },
  noir: {
    stops: [[0, 'rgba(245,245,245,0.68)'], [0.5, 'rgba(120,120,120,0.62)'], [1, 'rgba(8,8,8,0.88)']],
    tint: 'rgba(0,0,0,0.16)', accent: '#e8e8e8', titleA: '#ffffff', titleB: '#bdbdbd',
  },
};

export function loadImage(src) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('could not load ' + src)); };
    img.src = src;
  });
}

// Loads (and caches) one drawable image per panel, honouring uploads.
export async function loadPanelImages(st) {
  const cache = new Map();
  const out = [];
  for (const panel of st.panels) {
    let src = panel.upload;
    if (!src) {
      const found = SAMPLES.find(function (s) { return s.id === panel.sample; });
      src = found ? found.src : SAMPLES[0].src;
    }
    if (!cache.has(src)) cache.set(src, await loadImage(src));
    out.push(cache.get(src));
  }
  return out;
}

function tracePath(ctx, shape) {
  ctx.beginPath();
  shape.points.forEach(function (p, i) {
    if (i === 0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  });
  ctx.closePath();
}

function drawPanelImage(ctx, img, shape, panel, grade) {
  const box = shape.box;
  const scale = Math.max(box.w / img.width, box.h / img.height) * panel.zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = box.x + (box.w - dw) / 2 + panel.panX * box.w;
  const dy = box.y + (box.h - dh) / 2 + panel.panY * box.h;
  ctx.save();
  tracePath(ctx, shape);
  ctx.clip();
  if (grade === 'noir') ctx.filter = 'grayscale(0.85) contrast(1.12)';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  // Crisp light edge stroke around every panel.
  ctx.save();
  tracePath(ctx, shape);
  ctx.strokeStyle = 'rgba(255,242,220,0.92)';
  ctx.lineWidth = Math.max(2, Math.min(ctx.canvas.width, ctx.canvas.height) * 0.0032);
  ctx.stroke();
  ctx.restore();
}

function applyGrade(ctx, W, H, grade) {
  const wash = WASHES[grade];
  const grad = ctx.createLinearGradient(0, 0, W * 0.25, H);
  for (const stop of wash.stops) grad.addColorStop(stop[0], stop[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = wash.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// A retro sun disc drawn as horizontal bands: the gaps between bands
// widen towards the bottom, the classic synthwave sunset. Looks aim
// it at a panel of open sky (state.sky), never over a face.
function drawStripedSun(ctx, box, grade, fx, fy) {
  const cx = box.x + box.w * fx;
  const cy = box.y + box.h * fy;
  const r = Math.min(box.w, box.h) * 0.27;
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  if (grade === 'golden') {
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.6, '#ffa751');
    grad.addColorStop(1, '#ff7518');
  } else {
    grad.addColorStop(0, '#ffd23d');
    grad.addColorStop(0.55, '#ff7b3d');
    grad.addColorStop(1, '#ff2e88');
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  let y = cy - r;
  let band = r * 0.36;
  let gap = r * 0.015;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, band);
    y += band + gap;
    band *= 0.8;
    gap = Math.min(gap * 1.6, r * 0.14);
  }
  ctx.restore();
}

// Glowing concentric rings for Neon Nights, in the sky panel's sky.
function drawNeonRings(ctx, box, fx, fy) {
  const cx = box.x + box.w * fx;
  const cy = box.y + box.h * fy;
  const base = Math.min(box.w, box.h);
  const colors = ['#00e5ff', '#ff2ea6', '#7b2bff', '#00e5ff'];
  ctx.save();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, base * (0.085 + i * 0.047), 0, Math.PI * 2);
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = Math.max(2, base * 0.009);
    ctx.shadowColor = colors[i];
    ctx.shadowBlur = 22;
    ctx.stroke();
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const rad = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.36,
    W / 2, H / 2, Math.max(W, H) * 0.78
  );
  rad.addColorStop(0, 'rgba(8,0,18,0)');
  rad.addColorStop(1, 'rgba(8,0,18,0.44)');
  ctx.save();
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawGrain(ctx, W, H) {
  const s = 180;
  const tile = document.createElement('canvas');
  tile.width = s;
  tile.height = s;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(s, s);
  const rnd = mulberry32(0xc0ffee);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawHalftone(ctx, W, H) {
  const step = Math.max(10, Math.round(W / 90));
  const rnd = mulberry32(0x5eed);
  ctx.save();
  ctx.fillStyle = 'rgba(12,2,24,0.15)';
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      const r = (0.4 + rnd() * 0.6) * step * 0.16;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Layered display title: soft shadow, accent offset copy, heavy
// outline, then a two-stop gradient fill — all in Anton. Below it the
// Bebas Neue subtitle with a line-diamond-line flourish on each side.
function drawCaptions(ctx, W, H, st) {
  const wash = WASHES[st.grade];
  const size = st.titleSize * H;
  const y = st.titleY * H;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate((st.titleTilt * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = st.title.toUpperCase();
  ctx.font = size + 'px Anton, sans-serif';
  ctx.fillStyle = 'rgba(16,2,28,0.55)';
  ctx.fillText(title, size * 0.07, size * 0.09);
  ctx.fillStyle = wash.accent;
  ctx.fillText(title, -size * 0.045, -size * 0.045);
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = '#170826';
  ctx.strokeText(title, 0, 0);
  const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, wash.titleA);
  grad.addColorStop(1, wash.titleB);
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);

  const sub = st.subtitle.toUpperCase();
  const subSize = size * 0.3;
  const subY = size * 0.82;
  ctx.font = subSize + 'px "Bebas Neue", sans-serif';
  try { ctx.letterSpacing = Math.round(subSize * 0.35) + 'px'; } catch (err) { /* older engines */ }
  ctx.fillStyle = '#ffedcb';
  ctx.fillText(sub, 0, subY);
  const half = (ctx.measureText(sub).width + sub.length * subSize * 0.35) / 2;
  try { ctx.letterSpacing = '0px'; } catch (err) { /* older engines */ }
  const gap = subSize * 0.7;
  const lineLen = subSize * 2.6;
  ctx.strokeStyle = '#ffedcb';
  ctx.lineWidth = Math.max(1.5, subSize * 0.07);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * (half + gap), subY);
    ctx.lineTo(dir * (half + gap + lineLen), subY);
    ctx.stroke();
    ctx.save();
    ctx.translate(dir * (half + gap + lineLen + subSize * 0.55), subY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = wash.accent;
    const d = subSize * 0.3;
    ctx.fillRect(-d / 2, -d / 2, d, d);
    ctx.restore();
  }
  ctx.restore();
}

// Paints the whole cover onto ctx at W x H.
export function drawCover(ctx, W, H, st, images) {
  ctx.save();
  ctx.fillStyle = '#150722';
  ctx.fillRect(0, 0, W, H);
  const shapes = panelShapes(st.layout, W, H);
  shapes.forEach(function (shape, i) {
    if (images[i]) drawPanelImage(ctx, images[i], shape, st.panels[i], st.grade);
  });
  applyGrade(ctx, W, H, st.grade);
  const skyShape = shapes[st.sky.panel] || shapes[0];
  if (st.grade === 'vice' || st.grade === 'golden') {
    drawStripedSun(ctx, skyShape.box, st.grade, st.sky.fx, st.sky.fy);
  } else if (st.grade === 'neon') {
    drawNeonRings(ctx, skyShape.box, st.sky.fx, st.sky.fy);
  }
  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);
  drawHalftone(ctx, W, H);
  drawCaptions(ctx, W, H, st);
  ctx.restore();
}
