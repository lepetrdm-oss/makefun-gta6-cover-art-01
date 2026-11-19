// Sunset Cover Studio — cover renderer: panels, photos, colour grade and
// lettering, drawn on one canvas at the export size. Pure drawing: it takes
// the state and the loaded photos and paints the cover, nothing else.

import { GRADES, LAYOUTS } from './state.js';

// Panel rectangles in pixels, with gutters between and around them.
export function panelRects(state, W, H) {
  const g = Math.max(3, Math.round(W * 0.006));
  return LAYOUTS[state.layout].panels.map(([fx, fy, fw, fh]) => {
    const x = fx * W + g / 2;
    const y = fy * H + g / 2;
    const w = fw * W - g;
    const h = fh * H - g;
    return { x, y, w, h };
  });
}

function drawPanelPhoto(ctx, img, rect, panel, filter) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
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

// A glowing sun disc for the warm grades, a neon ring for the neon grade.
function drawSun(ctx, grade, W, H) {
  if (grade.sun === 'none') return;
  const cx = W * 0.76;
  const cy = H * 0.2;
  const r = W * 0.16;
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
  } else {
    const warm = grade.sun === 'gold'
      ? ['rgba(255, 214, 102, 0.95)', 'rgba(255, 140, 0, 0.55)', 'rgba(255, 110, 0, 0)']
      : ['rgba(255, 224, 130, 0.95)', 'rgba(255, 94, 98, 0.55)', 'rgba(255, 45, 120, 0)'];
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glow.addColorStop(0, warm[0]);
    glow.addColorStop(0.45, warm[1]);
    glow.addColorStop(1, warm[2]);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function applyGrade(ctx, grade, W, H) {
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
  vig.addColorStop(1, 'rgba(10, 0, 20, 0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
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
  const blockH = barH + gap + lines.length * lineHeight + gap * 0.6 + subPx;

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

  // The title itself: heavy lettering, dark outline, warm drop shadow.
  const titleY = top + barH + gap + lineHeight / 2;
  ctx.font = `${px}px ${family}`;
  ctx.shadowColor = grade.accent;
  ctx.shadowBlur = px * 0.16;
  ctx.shadowOffsetY = px * 0.03;
  lines.forEach((line, i) => {
    const y = titleY + i * lineHeight;
    if (state.outline) {
      ctx.lineWidth = Math.max(3, px * 0.085);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = grade.titleStroke;
      ctx.strokeText(line, cx, y);
    }
    const fill = ctx.createLinearGradient(0, y - px / 2, 0, y + px / 2);
    fill.addColorStop(0, grade.titleFill);
    fill.addColorStop(1, '#ffe3f1');
    ctx.fillStyle = fill;
    ctx.fillText(line, cx, y);
  });
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

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

  const rects = panelRects(state, W, H);
  rects.forEach((rect, i) => {
    const img = images[i];
    if (!img) return;
    drawPanelPhoto(ctx, img, rect, state.panels[i], grade.photoFilter);
  });

  drawSun(ctx, grade, W, H);
  applyGrade(ctx, grade, W, H);

  // A faint inner frame gives the poster its edge.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeRect(W * 0.008, H * 0.008, W * 0.984, H * 0.984);

  drawTitleBlock(ctx, state, grade, W, H);
}
