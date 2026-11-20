// Sunset Cover Studio — the poster renderer.
// Everything is drawn on a 2D canvas from (state, images). All randomness
// comes from mulberry32 with fixed seeds, so a given state always renders
// byte-identical output: no Math.random anywhere in this file.

'use strict';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function starPath(ctx, cx, cy, r, points, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ---- geometry -------------------------------------------------------------

function mastheadH(st, W, H) {
  if (!st.frameOn) return 0;
  const portrait = W < H * 1.05;
  if (st.frameStyle === 'premiere') return portrait ? H * 0.128 : H * 0.088;
  return portrait ? H * 0.112 : H * 0.062;
}

function bandH(st, W, H) {
  if (!st.frameOn || st.frameStyle !== 'premiere') return 0;
  return W < H * 1.05 ? H * 0.275 : H * 0.315;
}

function photoRegion(st, W, H) {
  if (st.frameOn && st.frameStyle === 'premiere') {
    const top = mastheadH(st, W, H);
    return { x: 0, y: top, w: W, h: H - top - bandH(st, W, H) };
  }
  return { x: 0, y: 0, w: W, h: H };
}

function panelRects(st, W, H) {
  const region = photoRegion(st, W, H);
  const g = Math.max(3, W * 0.0035);
  return LAYOUTS[st.layout].panels().map((p) => {
    const rect = {
      x: region.x + p.x * region.w,
      y: region.y + p.y * region.h,
      w: p.w * region.w,
      h: p.h * region.h,
    };
    const inner = { x: rect.x + g, y: rect.y + g, w: rect.w - g * 2, h: rect.h - g * 2 };
    let poly = null;
    if (p.poly) {
      poly = p.poly.map(([fx, fy]) => [region.x + fx * region.w, region.y + fy * region.h]);
    }
    return { rect: inner, bounds: rect, poly };
  });
}

function panelMeta(st, panel) {
  if (panel.upload && st.uploads[panel.upload]) {
    const up = st.uploads[panel.upload];
    return { focal: up.focal, sky: null, w: up.w, h: up.h };
  }
  const s = sampleById(panel.sample);
  return { focal: s.focal, sky: s.sky, w: 0, h: 0 };
}

function panelImage(images, panel) {
  return panel.upload ? images['upload:' + panel.upload] : images[panel.sample];
}

// Cover-fit placement. With autoFrame the focal point is centred in the
// panel (clamped so the photo always covers); the user's pan then shifts
// within the remaining overflow.
function placement(img, rect, panel, meta, autoFrame) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = dw - rect.w;
  const oy = dh - rect.h;
  let dx;
  let dy;
  if (autoFrame && meta.focal) {
    dx = rect.x + rect.w / 2 - meta.focal.x * dw;
    dy = rect.y + rect.h / 2 - meta.focal.y * dh;
  } else {
    dx = rect.x - ox / 2;
    dy = rect.y - oy / 2;
  }
  dx -= (panel.pan.x || 0) * ox * 0.5;
  dy -= (panel.pan.y || 0) * oy * 0.5;
  dx = clamp(dx, rect.x - ox, rect.x);
  dy = clamp(dy, rect.y - oy, rect.y);
  return { dx, dy, dw, dh };
}

// ---- decorations ----------------------------------------------------------

function makeSun(r, accent) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(r * 2);
  c.height = Math.ceil(r * 2);
  const x = c.getContext('2d');
  const grad = x.createLinearGradient(0, 0, 0, r * 2);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.55, '#ffa751');
  grad.addColorStop(1, '#ff2e88');
  x.fillStyle = grad;
  x.beginPath();
  x.arc(r, r, r, 0, Math.PI * 2);
  x.fill();
  // Retro stripes: gaps widen toward the bottom of the disc.
  x.globalCompositeOperation = 'destination-out';
  let y = r * 1.02;
  let gap = r * 0.045;
  while (y < r * 2) {
    x.fillRect(0, y, r * 2, gap);
    y += gap + r * 0.16;
    gap *= 1.45;
  }
  x.globalCompositeOperation = 'source-over';
  return c;
}

function drawRings(ctx, cx, cy, r, accent) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = r * 0.22;
  ctx.globalAlpha = 0.92;
  [0.45, 0.72, 0.98].forEach((k, i) => {
    ctx.lineWidth = r * (0.075 - i * 0.014);
    ctx.beginPath();
    ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

// ---- chrome pieces --------------------------------------------------------

function drawStars(ctx, x, y, r, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  for (let i = 0; i < 5; i++) {
    starPath(ctx, x + i * r * 2.35 + r, y, r, 5, 0.48);
    ctx.fill();
  }
  ctx.restore();
  return r * 2.35 * 4 + r * 2;
}

function fitPx(ctx, text, family, startPx, maxW) {
  let px = startPx;
  while (px > 6) {
    ctx.font = px + 'px ' + family;
    if (ctx.measureText(text).width <= maxW) break;
    px -= 1;
  }
  return px;
}

function drawQuotes(ctx, st, W, H, palette) {
  const mh = mastheadH(st, W, H);
  if (!mh) return;
  const portrait = W < H * 1.05;
  ctx.save();
  ctx.textBaseline = 'middle';
  if (!portrait) {
    const segW = (W * 0.90) / 3;
    st.quotes.forEach((item, i) => {
      const cx = W * 0.015 + segW * i + segW / 2;
      const starR = mh * 0.085;
      const starsW = starR * 2.35 * 4 + starR * 2;
      drawStars(ctx, cx - starsW / 2, mh * 0.20, starR, '#ffd166');
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.quoteInk;
      const qpx = fitPx(ctx, '"' + item.q + '"', "'Bebas Neue'", mh * 0.30, segW * 0.96);
      ctx.font = qpx + "px 'Bebas Neue'";
      ctx.fillText('"' + item.q + '"', cx, mh * 0.55);
      ctx.fillStyle = palette.pubInk;
      const ppx = Math.max(8, mh * 0.155);
      ctx.font = ppx + "px 'Bebas Neue'";
      try { ctx.letterSpacing = '2px'; } catch (e) { /* older engines */ }
      ctx.fillText('— ' + item.p + ' —', cx, mh * 0.845);
      try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
    });
    // VOL. 1 tag at the right end of the masthead.
    const bw = W * 0.052;
    const bh = mh * 0.52;
    const bx = W - bw - W * 0.008;
    const by = (mh - bh) / 2;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1.2, H * 0.0016);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.font = (bh * 0.52) + "px 'Bebas Neue'";
    ctx.fillText('VOL. 1', bx + bw / 2, by + bh / 2 + 1);
  } else {
    const rowH = mh / 3;
    st.quotes.forEach((item, i) => {
      const cy = rowH * i + rowH / 2;
      const starR = rowH * 0.16;
      drawStars(ctx, W * 0.03, cy, starR, '#ffd166');
      ctx.textAlign = 'left';
      ctx.fillStyle = palette.quoteInk;
      const text = '"' + item.q + '" — ' + item.p;
      const qpx = fitPx(ctx, text, "'Bebas Neue'", rowH * 0.42, W * 0.80);
      ctx.font = qpx + "px 'Bebas Neue'";
      ctx.fillText(text, W * 0.03 + starR * 13.5, cy);
    });
  }
  ctx.restore();
}

function makeSeal(r) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(r * 2);
  c.height = Math.ceil(r * 2);
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(r, r, r * 0.1, r, r, r);
  grad.addColorStop(0, '#ffe98a');
  grad.addColorStop(0.7, '#f5b921');
  grad.addColorStop(1, '#c07f0a');
  x.fillStyle = grad;
  starPath(x, r, r, r * 0.98, 28, 0.90);
  x.fill();
  x.strokeStyle = 'rgba(90,55,0,0.55)';
  x.lineWidth = r * 0.03;
  x.beginPath();
  x.arc(r, r, r * 0.78, 0, Math.PI * 2);
  x.stroke();
  x.fillStyle = '#5a3703';
  starPath(x, r, r * 0.80, r * 0.20, 5, 0.48);
  x.fill();
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = (r * 0.185) + "px 'Bebas Neue'";
  x.fillText('ORIGINAL', r, r * 1.13);
  x.font = (r * 0.185) + "px 'Bebas Neue'";
  x.fillText('COVER ART', r, r * 1.33);
  return c;
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(x, y, w, h);
  const rng = mulberry32(2027);
  const barArea = h * 0.66;
  ctx.fillStyle = '#111';
  let bx = x + w * 0.05;
  const end = x + w * 0.95;
  while (bx < end) {
    const bw = (0.6 + rng() * 2.6) * (w / 90);
    if (rng() > 0.32) ctx.fillRect(bx, y + h * 0.07, bw, barArea);
    bx += bw + (0.5 + rng() * 1.6) * (w / 90);
  }
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 ' + (h * 0.21) + 'px Arial';
  ctx.fillText('7 28019 00247 3', x + w / 2, y + h * 0.86);
  ctx.restore();
}

// ---- title ----------------------------------------------------------------

function renderTitleCanvas(st, W, H, grade, palette) {
  const size0 = H * 0.118;
  const meas = document.createElement('canvas').getContext('2d');
  const px = fitPx(meas, st.title.toUpperCase(), 'Anton', size0, W * 0.94);
  const tw = meas.measureText(st.title.toUpperCase()).width;
  const th = Math.ceil(px * 1.42);
  const c = document.createElement('canvas');
  c.width = Math.ceil(tw + px * 0.5);
  c.height = th;
  const x = c.getContext('2d');
  const cx = c.width / 2;
  const base = px * 1.06;
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.font = px + 'px Anton';
  const text = st.title.toUpperCase();
  // drop shadow
  x.fillStyle = 'rgba(0,0,0,0.55)';
  x.fillText(text, cx + px * 0.045, base + px * 0.05);
  // accent offset copy
  x.fillStyle = grade.accent;
  x.fillText(text, cx - px * 0.028, base + px * 0.022);
  // heavy outline
  x.lineJoin = 'round';
  x.strokeStyle = palette.titleOutline;
  x.lineWidth = px * 0.17;
  x.strokeText(text, cx, base);
  // chrome / ivory gradient fill
  const grad = x.createLinearGradient(0, base - px, 0, base);
  if (palette.ivoryTitle) {
    grad.addColorStop(0, '#fffef8');
    grad.addColorStop(0.5, '#efe4c8');
    grad.addColorStop(0.56, '#c9b586');
    grad.addColorStop(1, '#f7efdb');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.42, '#ffedb8');
    grad.addColorStop(0.50, '#8a6a1f');
    grad.addColorStop(0.57, '#ffe9a8');
    grad.addColorStop(1, grade.accent);
  }
  x.fillStyle = grad;
  x.fillText(text, cx, base);
  // bevel highlight: a thin bright copy nudged up
  x.save();
  x.globalAlpha = 0.35;
  x.fillStyle = '#ffffff';
  x.fillText(text, cx, base - px * 0.018);
  x.restore();
  if (st.printTexture) {
    // Distressed print: seeded speckles eaten out of the letters.
    const rng = mulberry32(4242);
    x.globalCompositeOperation = 'destination-out';
    const n = Math.floor((c.width * c.height) / 2600);
    for (let i = 0; i < n; i++) {
      const sx = rng() * c.width;
      const sy = rng() * c.height;
      const sr = 0.6 + rng() * 2.4;
      x.globalAlpha = 0.05 + rng() * 0.16;
      x.beginPath();
      x.arc(sx, sy, sr, 0, Math.PI * 2);
      x.fill();
    }
    for (let i = 0; i < 7; i++) {
      x.globalAlpha = 0.05 + rng() * 0.08;
      x.fillRect(rng() * c.width, rng() * c.height, 20 + rng() * 90, 1 + rng() * 1.6);
    }
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
  }
  return { canvas: c, px };
}

// ---- tags -----------------------------------------------------------------

function drawTag(ctx, st, panel, meta, place, rect, grade, W, H) {
  if (!st.tagsOn) return;
  const name = (panel.name || '').trim();
  const role = (panel.tag || '').trim();
  if (!name && !role) return;
  const namePx = clamp(rect.h * 0.062, 10, H * 0.030);
  const rolePx = namePx * 0.72;
  ctx.save();
  ctx.font = namePx + 'px Anton';
  const nameW = name ? ctx.measureText(name.toUpperCase()).width : 0;
  ctx.font = rolePx + "px 'Bebas Neue'";
  const roleW = role ? ctx.measureText(role.toUpperCase()).width : 0;
  const w = Math.max(nameW, roleW) + namePx * 1.15;
  const h = namePx + rolePx + namePx * 0.78;
  // Side opposite the focal point, so the label never sits on the face.
  const focalX = meta.focal ? meta.focal.x : 0.5;
  const inset = rect.w * 0.045;
  const tx = focalX < 0.42 ? rect.x + rect.w - w - inset : rect.x + inset;
  let ty = rect.y + rect.h - h - rect.h * 0.045;
  // A bottom strip panel's lower edge sits inside the title zone: put its
  // tag along the panel's top edge instead of under the title.
  if (rect.y > H * 0.5 && rect.y + rect.h > H * 0.84) ty = rect.y + rect.h * 0.05;
  // A tag that would collide with the centred title block is lifted just
  // above the title zone (the middle panel of a slanted trio, say).
  const titleZoneTop = st.frameOn && st.frameStyle === 'premiere' ? H : H * 0.775;
  if (ty + h > titleZoneTop && tx + w > W * 0.20 && tx < W * 0.80) {
    ty = Math.min(ty, titleZoneTop - h - H * 0.012);
  }
  ctx.translate(tx, ty);
  ctx.transform(1, 0, -0.16, 1, 0, 0); // slanted label
  ctx.fillStyle = 'rgba(8,6,16,0.86)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, 0, Math.max(3, namePx * 0.16), h);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let cy = namePx * 0.62;
  if (name) {
    ctx.fillStyle = '#ffffff';
    ctx.font = namePx + 'px Anton';
    cy += namePx * 0.42;
    ctx.fillText(name.toUpperCase(), namePx * 0.52, cy);
    cy += rolePx * 1.18;
  } else {
    cy += rolePx * 0.9;
  }
  if (role) {
    ctx.fillStyle = grade.accent;
    ctx.font = rolePx + "px 'Bebas Neue'";
    ctx.fillText(role.toUpperCase(), namePx * 0.52, cy);
  }
  ctx.restore();
}

// ---- grain + halftone -----------------------------------------------------

let noiseCanvas = null;
function getNoise() {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d');
  const img = x.createImageData(256, 256);
  const rng = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 16;
  }
  x.putImageData(img, 0, 0);
  noiseCanvas = c;
  return c;
}

// ---- main render ----------------------------------------------------------

function renderPoster(ctx, st, images, W, H, opts) {
  opts = opts || {};
  const grade = GRADES[st.grade];
  const premiere = st.frameOn && st.frameStyle === 'premiere';
  const palette = premiere
    ? { quoteInk: '#f3ead2', pubInk: '#c9a227', titleOutline: '#0a0a0c', ivoryTitle: true }
    : { quoteInk: '#ffffff', pubInk: '#ffd166', titleOutline: '#14081f', ivoryTitle: false };
  const region = photoRegion(st, W, H);
  const rects = panelRects(st, W, H);
  const n = panelCount(st);

  ctx.save();
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, 0, W, H);

  // Panels
  const wash = ctx.createLinearGradient(0, region.y, 0, region.y + region.h);
  grade.wash.forEach(([o, col]) => wash.addColorStop(o, col));
  // Decoration spot: the largest panel whose sky point lands inside it;
  // otherwise the largest panel's top corner opposite its focal point.
  let decorSpot = null;
  if (grade.decor !== 'none') {
    const order = rects.map((r, i) => i).sort((a, b) =>
      rects[b].rect.w * rects[b].rect.h - rects[a].rect.w * rects[a].rect.h);
    for (const i of order) {
      const img = panelImage(images, st.panels[i]);
      if (!img) continue;
      const meta = panelMeta(st, st.panels[i]);
      const rect = rects[i].rect;
      if (meta.sky) {
        const place = placement(img, rect, st.panels[i], meta, st.autoFrame);
        const sx = place.dx + meta.sky.x * place.dw;
        const sy = place.dy + meta.sky.y * place.dh;
        if (sx > rect.x && sx < rect.x + rect.w && sy > rect.y && sy < rect.y + rect.h) {
          decorSpot = { i, sx, sy };
          break;
        }
      }
      if (!decorSpot) {
        const fx = meta.focal && meta.focal.x > 0.5 ? 0.16 : 0.84;
        decorSpot = { i, sx: rect.x + rect.w * fx, sy: rect.y + rect.h * 0.13 };
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const panel = st.panels[i];
    const img = panelImage(images, panel);
    if (!img) continue;
    const { rect, poly } = rects[i];
    const meta = panelMeta(st, panel);
    const place = placement(img, rect, panel, meta, st.autoFrame);
    ctx.save();
    ctx.beginPath();
    if (poly) {
      poly.forEach(([pxx, pyy], j) => (j === 0 ? ctx.moveTo(pxx, pyy) : ctx.lineTo(pxx, pyy)));
      ctx.closePath();
    } else {
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.clip();
    try { ctx.filter = grade.filter || 'none'; } catch (e) { /* ignore */ }
    ctx.drawImage(img, place.dx, place.dy, place.dw, place.dh);
    try { ctx.filter = 'none'; } catch (e) { /* ignore */ }
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    // decoration over this panel's open sky
    if (decorSpot && i === decorSpot.i) {
      const r = Math.min(rect.w, rect.h) * 0.26;
      if (grade.decor === 'sun') {
        const sun = makeSun(r, grade.accent);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(sun, decorSpot.sx - r, decorSpot.sy - r);
        ctx.globalAlpha = 1;
      } else if (grade.decor === 'rings') {
        drawRings(ctx, decorSpot.sx, decorSpot.sy, r, grade.accent);
      }
    }
    ctx.restore();
    // light edge stroke
    ctx.save();
    ctx.beginPath();
    if (poly) {
      poly.forEach(([pxx, pyy], j) => (j === 0 ? ctx.moveTo(pxx, pyy) : ctx.lineTo(pxx, pyy)));
      ctx.closePath();
    } else {
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.stroke();
    ctx.restore();
  }

  // Vignette over the photo region
  const vg = ctx.createRadialGradient(
    region.x + region.w / 2, region.y + region.h / 2, Math.min(region.w, region.h) * 0.36,
    region.x + region.w / 2, region.y + region.h / 2, Math.max(region.w, region.h) * 0.78
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,' + grade.vignette + ')');
  ctx.fillStyle = vg;
  ctx.fillRect(region.x, region.y, region.w, region.h);

  // Grain + halftone over the photo region
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  const pat = ctx.createPattern(getNoise(), 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(region.x, region.y, region.w, region.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  const step = Math.max(7, W * 0.006);
  for (let yy = region.y + step / 2; yy < region.y + region.h; yy += step) {
    for (let xx = region.x + step / 2; xx < region.x + region.w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, step * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Name tags
  for (let i = 0; i < n; i++) {
    const panel = st.panels[i];
    const img = panelImage(images, panel);
    if (!img) continue;
    const meta = panelMeta(st, panel);
    const place = placement(img, rects[i].rect, panel, meta, st.autoFrame);
    drawTag(ctx, st, panel, meta, place, rects[i].rect, grade, W, H);
  }

  // Frame bands (premiere) or masthead backing (sunset)
  const mh = mastheadH(st, W, H);
  const bh = bandH(st, W, H);
  if (st.frameOn) {
    if (premiere) {
      ctx.fillStyle = '#08080a';
      ctx.fillRect(0, 0, W, mh);
      ctx.fillRect(0, H - bh, W, bh);
      const rule = ctx.createLinearGradient(0, 0, W, 0);
      rule.addColorStop(0, '#8a6a1f');
      rule.addColorStop(0.5, '#ffd166');
      rule.addColorStop(1, '#8a6a1f');
      ctx.fillStyle = rule;
      ctx.fillRect(0, mh - Math.max(2, H * 0.0022), W, Math.max(2, H * 0.0022));
      ctx.fillRect(0, H - bh, W, Math.max(2, H * 0.0022));
    } else {
      ctx.fillStyle = 'rgba(6,3,14,0.58)';
      ctx.fillRect(0, 0, W, mh);
      ctx.fillStyle = grade.accent;
      ctx.globalAlpha = 0.65;
      ctx.fillRect(0, mh, W, Math.max(1.5, H * 0.0018));
      ctx.globalAlpha = 1;
      // bottom scrim so the title zone reads over any photo
      const scrim = ctx.createLinearGradient(0, H * 0.60, 0, H);
      scrim.addColorStop(0, 'rgba(5,2,12,0)');
      scrim.addColorStop(1, 'rgba(5,2,12,0.88)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, H * 0.60, W, H * 0.40);
    }
    drawQuotes(ctx, st, W, H, palette);
  }

  // Title (rendered offscreen so the print texture can eat into the letters)
  const title = renderTitleCanvas(st, W, H, grade, palette);
  const titleBaseline = premiere ? H - bh + bh * 0.50 : H * 0.862;
  ctx.drawImage(title.canvas, (W - title.canvas.width) / 2, titleBaseline - title.px * 1.06);

  // Subtitle with line–diamond–line flourish
  const subY = premiere ? H - bh + bh * 0.665 : H * 0.912;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const subPx = fitPx(ctx, st.subtitle.toUpperCase(), "'Bebas Neue'", H * 0.030, W * 0.8);
  ctx.font = subPx + "px 'Bebas Neue'";
  try { ctx.letterSpacing = '3px'; } catch (e) { /* ignore */ }
  const subText = st.subtitle.toUpperCase();
  const subW = ctx.measureText(subText).width;
  ctx.fillStyle = premiere ? '#e9dfc8' : '#ffffff';
  ctx.fillText(subText, W / 2, subY);
  const lineLen = Math.min(W * 0.10, (W - subW) / 2 - W * 0.045);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(1.2, H * 0.0018);
  const dy = subY;
  [[-1, W / 2 - subW / 2 - W * 0.018], [1, W / 2 + subW / 2 + W * 0.018]].forEach(([dir, edge]) => {
    const x1 = edge + dir * lineLen;
    ctx.beginPath();
    ctx.moveTo(edge, dy);
    ctx.lineTo(x1, dy);
    ctx.stroke();
    const dxp = x1 + dir * subPx * 0.32;
    ctx.save();
    ctx.fillStyle = grade.accent;
    ctx.translate(dxp, dy);
    ctx.rotate(Math.PI / 4);
    const s = subPx * 0.16;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  });
  ctx.restore();

  // Billing block
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const billY = premiere ? H - bh + bh * 0.845 : H * 0.949;
  const billPx = fitPx(ctx, st.billing, "'Bebas Neue'", H * 0.0165, W * 0.86);
  ctx.font = billPx + "px 'Bebas Neue'";
  try { ctx.letterSpacing = '2px'; } catch (e) { /* ignore */ }
  ctx.fillStyle = premiere ? 'rgba(233,223,200,0.62)' : 'rgba(255,255,255,0.55)';
  ctx.fillText(st.billing, W / 2, billY);
  ctx.restore();

  if (st.frameOn) {
    // Seal
    const sealR = W * (premiere ? 0.050 : 0.052);
    const seal = makeSeal(sealR);
    const sealCx = W * 0.905;
    const sealCy = premiere ? H - bh : H * 0.748;
    ctx.save();
    ctx.translate(sealCx, sealCy);
    ctx.rotate(-0.20);
    ctx.drawImage(seal, -sealR, -sealR);
    ctx.restore();
    // Barcode
    const bw2 = W * 0.105;
    const bh2 = H * 0.044;
    drawBarcode(ctx, W - bw2 - W * 0.018, H - bh2 - H * 0.010, bw2, bh2);
    // Coming soon micro-strip
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const csPx = H * 0.019;
    ctx.font = csPx + "px 'Bebas Neue'";
    try { ctx.letterSpacing = '3px'; } catch (e) { /* ignore */ }
    ctx.fillStyle = premiere ? '#c9a227' : 'rgba(255,255,255,0.78)';
    const csY = H - H * 0.026;
    ctx.fillText('◆ COMING SOON', W * 0.026, csY);
    ctx.restore();
  }

  // Editor-only selection outline
  if (opts.editor && rects[st.selected]) {
    const r = rects[st.selected].bounds;
    ctx.save();
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([9, 6]);
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.restore();
  }
  ctx.restore();
}
