// Sunset Cover Studio — editor wiring. Builds the controls, owns the
// state, handles drag-to-pan and uploads, and drives PNG export.
import {
  SAMPLES, LAYOUTS, GRADES, LOOKS, COVER_SIZES,
  defaultState, layoutById, sizeById, sampleById, lookById, makePanel,
} from './state.js';
import { renderCover, panelShapes, shapeBounds, pointInShape, imagePlacement } from './cover.js';
import { setupShots } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
let state = defaultState();

// ------------------------------------------------------------------ images
const imageCache = new Map();
function loadImage(key, src) {
  if (!imageCache.has(key)) {
    const im = new Image();
    im.addEventListener('load', () => scheduleRender());
    im.src = src;
    imageCache.set(key, im);
  }
  return imageCache.get(key);
}
function getImage(panel) {
  const key = panel.upload || `sample:${panel.sample}`;
  const src = panel.upload || sampleById(panel.sample).src;
  const im = loadImage(key, src);
  return im.complete && im.naturalWidth > 0 ? im : null;
}
function panelImageReady(panel) {
  const im = getImage(panel);
  return im !== null;
}

// ------------------------------------------------------------------ render
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}
function render() {
  const size = sizeById(state.size);
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  renderCover(ctx, size.w, size.h, state, getImage);
  // The selection outline is an editor aid; a cover shot must be clean.
  if (!document.body.classList.contains('shot-cover')) drawSelection(size.w, size.h);
}
function drawSelection(W, H) {
  const shapes = panelShapes(state.layout, W, H);
  const shape = shapes[state.selected];
  if (!shape) return;
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0,229,255,0.9)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.setLineDash([W * 0.012, W * 0.008]);
  ctx.stroke();
  ctx.restore();
}

// --------------------------------------------------------------- state ops
function syncPanelCount() {
  const want = layoutById(state.layout).panels;
  while (state.panels.length < want) {
    state.panels.push(makePanel(SAMPLES[state.panels.length % SAMPLES.length].id));
  }
  state.panels.length = want;
  if (state.selected >= want) state.selected = want - 1;
  if (state.decoPanel >= want) state.decoPanel = want - 1;
}

function applyLook(look) {
  state.layout = look.layout;
  state.grade = look.grade;
  state.title = look.title;
  state.subtitle = look.subtitle;
  state.size = look.size;
  state.decoPanel = look.decoPanel;
  state.panels = look.panels.map((id) => makePanel(id));
  state.selected = 0;
  buildControls();
  scheduleRender();
}

function setSize(id) {
  state.size = id;
  scheduleRender();
}

// ---------------------------------------------------------------- controls
const $ = (id) => document.getElementById(id);

function chipRow(el, items, current, onPick) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (item.id === current ? ' active' : '');
    b.textContent = item.label;
    b.addEventListener('click', () => onPick(item.id));
    el.appendChild(b);
  }
}

function buildControls() {
  chipRow($('looks'), LOOKS, null, (id) => applyLook(lookById(id)));
  chipRow($('layouts'), LAYOUTS, state.layout, (id) => {
    state.layout = id; syncPanelCount(); buildControls(); scheduleRender();
  });
  chipRow($('grades'), GRADES, state.grade, (id) => {
    state.grade = id; buildControls(); scheduleRender();
  });
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  const sizeSel = $('size');
  sizeSel.innerHTML = '';
  for (const s of COVER_SIZES) {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.label;
    sizeSel.appendChild(o);
  }
  sizeSel.value = state.size;
  buildPanelControls();
}

function buildPanelControls() {
  const wrap = $('panels');
  wrap.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const box = document.createElement('fieldset');
    box.className = 'panelbox' + (i === state.selected ? ' selected' : '');
    const legend = document.createElement('legend');
    legend.textContent = `Panel ${i + 1}`;
    box.appendChild(legend);
    box.addEventListener('click', () => {
      if (state.selected !== i) { state.selected = i; buildPanelControls(); scheduleRender(); }
    });

    const sel = document.createElement('select');
    for (const s of SAMPLES) {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.label;
      sel.appendChild(o);
    }
    const up = document.createElement('option');
    up.value = '__upload'; up.textContent = 'Your upload…';
    sel.appendChild(up);
    sel.value = panel.upload ? '__upload' : panel.sample;

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      if (panel.upload) URL.revokeObjectURL(panel.upload);
      panel.upload = URL.createObjectURL(f);
      state.selected = i;
      buildPanelControls();
      scheduleRender();
    });
    sel.addEventListener('change', () => {
      state.selected = i;
      if (sel.value === '__upload') { file.click(); return; }
      panel.sample = sel.value;
      panel.upload = null;
      buildPanelControls();
      scheduleRender();
    });

    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range'; zoom.min = '1'; zoom.max = '2.5'; zoom.step = '0.01';
    zoom.value = String(panel.zoom);
    zoom.addEventListener('input', () => { panel.zoom = Number(zoom.value); scheduleRender(); });
    zoomLabel.appendChild(zoom);

    const row = document.createElement('div');
    row.className = 'btnrow';
    const reset = document.createElement('button');
    reset.type = 'button'; reset.className = 'chip'; reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      panel.zoom = 1; panel.panX = 0.5; panel.panY = 0.5;
      buildPanelControls(); scheduleRender();
    });
    const all = document.createElement('button');
    all.type = 'button'; all.className = 'chip'; all.textContent = 'Use in all panels';
    all.addEventListener('click', () => {
      for (const p of state.panels) {
        p.sample = panel.sample; p.upload = panel.upload;
        p.zoom = panel.zoom; p.panX = panel.panX; p.panY = panel.panY;
      }
      buildPanelControls(); scheduleRender();
    });
    row.append(reset, all);

    box.append(sel, file, zoomLabel, row);
    wrap.appendChild(box);
  });
}

// --------------------------------------------------------------- drag pan
let drag = null;
function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  const size = sizeById(state.size);
  return {
    x: (ev.clientX - r.left) * (size.w / r.width),
    y: (ev.clientY - r.top) * (size.h / r.height),
  };
}
canvas.addEventListener('pointerdown', (ev) => {
  const pt = canvasPoint(ev);
  const size = sizeById(state.size);
  const shapes = panelShapes(state.layout, size.w, size.h);
  const idx = shapes.findIndex((s) => pointInShape(s, pt.x, pt.y));
  if (idx < 0) return;
  state.selected = idx;
  drag = { idx, lastX: pt.x, lastY: pt.y };
  canvas.setPointerCapture(ev.pointerId);
  buildPanelControls();
  scheduleRender();
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const pt = canvasPoint(ev);
  const dx = pt.x - drag.lastX, dy = pt.y - drag.lastY;
  drag.lastX = pt.x; drag.lastY = pt.y;
  const panel = state.panels[drag.idx];
  const img = getImage(panel);
  if (!img) return;
  const size = sizeById(state.size);
  const shapes = panelShapes(state.layout, size.w, size.h);
  const bounds = shapeBounds(shapes[drag.idx]);
  const p = imagePlacement(img, bounds, panel);
  // The placement offset moves with (bounds - drawn) * pan, so dragging
  // the photo right means decreasing the focal point along that axis.
  if (p.dw > bounds.w) panel.panX = clamp01(panel.panX - dx / (p.dw - bounds.w));
  if (p.dh > bounds.h) panel.panY = clamp01(panel.panY - dy / (p.dh - bounds.h));
  scheduleRender();
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
function clamp01(v) { return Math.min(1, Math.max(0, v)); }

// ------------------------------------------------------------------ export
function exportPNG() {
  const size = sizeById(state.size);
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  renderCover(off.getContext('2d'), size.w, size.h, state, getImage);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// -------------------------------------------------------------------- init
$('title').addEventListener('input', () => { state.title = $('title').value; scheduleRender(); });
$('subtitle').addEventListener('input', () => { state.subtitle = $('subtitle').value; scheduleRender(); });
$('size').addEventListener('change', () => setSize($('size').value));
$('exportBtn').addEventListener('click', exportPNG);

function whenReady() {
  const fonts = Promise.all([
    document.fonts.load('80px Anton'),
    document.fonts.load('40px "Bebas Neue"'),
    document.fonts.ready,
  ]);
  const images = new Promise((resolve) => {
    const tick = () => {
      if (state.panels.every((p) => panelImageReady(p))) resolve();
      else setTimeout(tick, 60);
    };
    tick();
  });
  return Promise.all([fonts, images]).then(() => render());
}

buildControls();
scheduleRender();
setupShots({
  applyLook: (id) => applyLook(lookById(id)),
  setSize,
  whenReady,
  markCoverMode: () => document.body.classList.add('shot-cover'),
  markEditorMode: () => document.body.classList.add('shot-editor'),
});

// Exposed for the validation harness: renders an export at an exact size
// on an offscreen canvas and hands back its PNG bytes as a data URL.
window.__exportForTest = (sizeId) => new Promise((resolve) => {
  const size = sizeById(sizeId);
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  renderCover(off.getContext('2d'), size.w, size.h, state, getImage);
  resolve(off.toDataURL('image/png'));
});
