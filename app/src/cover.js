// Sunset Cover Studio — cover.js
// The render engine. drawCover paints one cover onto a canvas context at a
// given pixel size: photos clipped into the layout's panels, the grade's
// colour wash, a striped retro sun or neon rings, a whisper of film grain,
// and the layered caption. Everything is deterministic — the only randomness
// comes from a seeded PRNG, so a screenshot scene renders identically twice.

const GUTTER = 0.007; // panel gap, as a fraction of the cover's width

// A tiny seeded PRNG (mulberry32) for the grain and halftone texture.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A rectangle as a polygon, shrunk by the gutter on every side.
function rectPoly(x, y, w, h) {
  const gx = GUTTER;
  const gy = GUTTER * 1.4;
  return [
    [x + gx, y + gy],
    [x + w - gx, y + gy],
    [x + w - gx, y + h - gy],
    [x + gx, y + h - gy],
  ];
}

// The panels of a layout, as polygons in unit space (0..1 on both axes).
// The slanted trio's dividers run diagonally, with the gutter built into the
// gap between neighbouring polygons.
function panelPolys(layout) {
  switch (layout) {
    case 'one':
      return [rectPoly(0, 0, 1, 1)];
    case 'hero':
      return [rectPoly(0, 0, 0.58, 1), rectPoly(0.58, 0, 0.42, 0.52), rectPoly(0.58, 0.52, 0.42, 0.48)];
    case 'trio':
      return [rectPoly(0, 0, 1 / 3, 1), rectPoly(1 / 3, 0, 1 / 3, 1), rectPoly(2 / 3, 0, 1 / 3, 1)];
    case 'slant':
      return [
        [[0, 0], [0.352, 0], [0.292, 1], [0, 1]],
        [[0.368, 0], [0.688, 0], [0.628, 1], [0.308, 1]],
        [[0.704, 0], [1, 0], [1, 1], [0.644, 1]],
      ];
    case 'grid':
      return [rectPoly(0, 0, 0.5, 0.5), rectPoly(0.5, 0, 0.5, 0.5), rectPoly(0, 0.5, 0.5, 0.5), rectPoly(0.5, 0.5, 0.5, 0.5)];
    default:
      return [rectPoly(0, 0, 1, 1)];
  }
}

// A polygon's bounding box, in unit space.
function panelBBox(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// Point-in-polygon in unit space, for panel hit-testing while dragging.
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function tracePoly(ctx, poly, w, h) {
  ctx.beginPath();
  poly.forEach(([ux, uy], i) => {
    if (i === 0) ctx.moveTo(ux * w, uy * h);
    else ctx.lineTo(ux * w, uy * h);
  });
  ctx.closePath();
}

// Draw one photo into one panel: clipped to the polygon, cover-fitted into
// its bounding box, scaled by the panel's zoom around its focal point.
function drawPanelPhoto(ctx, img, poly, w, h, panel, grade) {
  const bb = panelBBox(poly);
  const bw = bb.w * w;
  const bh = bb.h * h;
  const scale = Math.max(bw / img.width, bh / img.height) * panel.zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = bb.x * w + panel.ox * (bw - dw);
  const dy = bb.y * h + panel.oy * (bh - dh);
  ctx.save();
  tracePoly(ctx, poly, w, h);
  ctx.clip();
  ctx.filter = grade.photoFilter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

// The grade's multi-stop colour wash over the whole cover, plus a vignette.
function drawWash(ctx, w, h, grade) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, grade.wash[0]);
  grad.addColorStop(0.45, grade.wash[1]);
  grad.addColorStop(1, grade.wash[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 18, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

// The retro sun: a disc with a two-stop vertical gradient, cut by horizontal
// stripes that thicken towards the bottom. Drawn on a scratch canvas so the
// cuts are true transparency, then composited with a soft glow.
function drawStripedSun(ctx, w, h, grade) {
  const r = Math.min(w, h) * 0.17;
  const cx = w * 0.78;
  const cy = h * 0.235;
  const scratch = document.createElement('canvas');
  scratch.width = Math.ceil(r * 2);
  scratch.height = Math.ceil(r * 2);
  const s = scratch.getContext('2d');
  const grad = s.createLinearGradient(0, 0, 0, r * 2);
  grad.addColorStop(0, grade.sunTop);
  grad.addColorStop(1, grade.sunBottom);
  s.fillStyle = grad;
  s.beginPath();
  s.arc(r, r, r, 0, Math.PI * 2);
  s.fill();
  s.globalCompositeOperation = 'destination-out';
  let y = r * 1.08;
  let thick = r * 0.028;
  while (y < r * 2) {
    s.fillRect(0, y, r * 2, thick);
    y += thick + r * 0.105;
    thick *= 1.45;
  }
  s.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.shadowColor = grade.sunBottom;
  ctx.shadowBlur = r * 0.35;
  ctx.drawImage(scratch, cx - r, cy - r);
  ctx.restore();
}

// Neon grades draw glowing concentric rings in place of the sun.
function drawNeonRings(ctx, w, h, grade) {
  const cx = w * 0.78;
  const cy = h * 0.235;
  const base = Math.min(w, h);
  ctx.save();
  ctx.lineWidth = Math.max(2, base * 0.006);
  [0.165, 0.125, 0.085].forEach((f, i) => {
    ctx.beginPath();
    ctx.strokeStyle = i === 1 ? grade.sunBottom : grade.accent;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = base * 0.03;
    ctx.arc(cx, cy, base * f, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

// A whisper of seeded film grain and a fine halftone dot texture. Kept very
// light: it should read as print texture, never as a dot mesh.
function drawGrain(ctx, w, h) {
  const rand = mulberry32(20261119);
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const t = tile.getContext('2d');
  const data = t.createImageData(256, 256);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 16;
  }
  t.putImageData(data, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.save();
  const step = Math.max(6, Math.round(Math.min(w, h) / 150));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let yy = step / 2; yy < h; yy += step) {
    for (let xx = step / 2; xx < w; xx += step) {
      if (rand() > 0.5) continue;
      ctx.beginPath();
      ctx.arc(xx, yy, step * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Fit a font size to a text width: shrink the preferred size until it fits.
function fitFontSize(ctx, text, fontFamily, preferred, maxWidth) {
  let size = preferred;
  ctx.font = `${size}px ${fontFamily}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `${size}px ${fontFamily}`;
  }
  return size;
}

// The caption: a layered title (soft dark drop, accent offset, heavy outline,
// two-stop gradient fill) and a letter-spaced subtitle with a
// rules-and-diamond flourish under it.
function drawCaption(ctx, w, h, state, grade) {
  const title = (state.title || '').toUpperCase();
  const subtitle = (state.subtitle || '').toUpperCase();
  const cx = w / 2;
  const titleBase = (w * 0.118 * state.titleSize) / 100;
  const titleSize = title ? fitFontSize(ctx, title, 'Anton', titleBase, w * 0.92) : titleBase;
  const subSize = Math.max(14, titleSize * 0.21);
  const blockH = titleSize * 1.04 + subSize * 1.9;
  let top;
  if (state.titlePos === 'top') top = h * 0.055;
  else if (state.titlePos === 'middle') top = h / 2 - blockH / 2;
  else top = h * 0.945 - blockH;
  ctx.save();
  ctx.translate(cx, top + blockH / 2);
  ctx.rotate(((state.tilt || 0) * Math.PI) / 180);
  ctx.translate(-cx, -(top + blockH / 2));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    const y = top + titleSize * 0.92;
    ctx.font = `${titleSize}px Anton`;
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.shadowColor = 'rgba(16, 3, 30, 0.6)';
    ctx.shadowBlur = titleSize * 0.16;
    ctx.shadowOffsetY = titleSize * 0.05;
    ctx.fillStyle = '#1b0b30';
    ctx.fillText(title, cx, y);
    ctx.restore();
    ctx.fillStyle = grade.accent;
    ctx.fillText(title, cx + titleSize * 0.02, y + titleSize * 0.022);
    if (state.outline) {
      ctx.strokeStyle = '#160a2e';
      ctx.lineWidth = titleSize * 0.15;
      ctx.strokeText(title, cx, y);
    }
    const fill = ctx.createLinearGradient(0, y - titleSize, 0, y);
    fill.addColorStop(0, grade.titleFill[0]);
    fill.addColorStop(1, grade.titleFill[1]);
    ctx.fillStyle = fill;
    ctx.fillText(title, cx, y);
  }
  if (subtitle) {
    const y = top + titleSize * 1.04 + subSize * 1.25;
    ctx.font = `${subSize}px 'Bebas Neue'`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.34)}px`;
    } catch {
      // Older engines have no letterSpacing; the subtitle still reads fine.
    }
    ctx.save();
    ctx.shadowColor = 'rgba(10, 2, 20, 0.65)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, cx, y);
    ctx.restore();
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Nothing to reset where the property does not exist.
    }
    // The flourish: a rule, a diamond, a rule, in the grade's accent.
    const fy = y + subSize * 0.62;
    const half = w * 0.17;
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(2, subSize * 0.09);
    ctx.beginPath();
    ctx.moveTo(cx - half, fy);
    ctx.lineTo(cx - subSize * 0.55, fy);
    ctx.moveTo(cx + subSize * 0.55, fy);
    ctx.lineTo(cx + half, fy);
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, fy);
    ctx.rotate(Math.PI / 4);
    const d = subSize * 0.17;
    ctx.fillStyle = grade.accent;
    ctx.fillRect(-d / 2, -d / 2, d, d);
    ctx.restore();
  }
  ctx.restore();
}

// Crisp light edge strokes around every panel, over a wider dark stroke.
function drawPanelEdges(ctx, polys, w, h, grade) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const poly of polys) {
    tracePoly(ctx, poly, w, h);
    ctx.strokeStyle = 'rgba(10, 5, 22, 0.55)';
    ctx.lineWidth = Math.max(4, w * 0.0046);
    ctx.stroke();
    tracePoly(ctx, poly, w, h);
    ctx.strokeStyle = grade.edge;
    ctx.lineWidth = Math.max(2, w * 0.0021);
    ctx.stroke();
  }
  ctx.restore();
}

// Paint the whole cover. images[i] is the loaded image for panel i (or null,
// in which case the panel is painted with the grade's deep base colour).
function drawCover(ctx, w, h, state, images) {
  const grade = StudioData.grades[state.grade];
  const polys = panelPolys(state.layout);
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, w, h);
  polys.forEach((poly, i) => {
    const img = images[i];
    if (img) drawPanelPhoto(ctx, img, poly, w, h, state.panels[i], grade);
  });
  drawWash(ctx, w, h, grade);
  if (grade.sun === 'striped') drawStripedSun(ctx, w, h, grade);
  else if (grade.sun === 'rings') drawNeonRings(ctx, w, h, grade);
  drawGrain(ctx, w, h);
  drawPanelEdges(ctx, polys, w, h, grade);
  drawCaption(ctx, w, h, state, grade);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = Math.max(2, w * 0.0016);
  const inset = Math.min(w, h) * 0.012;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
}

window.StudioCover = { panelPolys, panelBBox, pointInPoly, drawCover, mulberry32 };
