// Sunset Cover Studio — the editor: controls, panel cards, drag-to-pan,
// photo uploads and PNG export. The preview canvas is painted at the export
// size, so what you see is exactly what the PNG holds.

import { drawCover, panelRects } from './cover.js';
import {
  GRADES, LAYOUTS, SAMPLES, SAMPLE_KEYS, SIZES,
  defaultPanel, defaultState, fitPanelsToLayout, loadPanelPhotos,
} from './state.js';
import { applyShotParams, markShotReady, shotMode } from './shots.js';

const state = defaultState();
const preview = document.getElementById('preview');
const statusEl = document.getElementById('status');
const panelList = document.getElementById('panelList');
let photos = [];

function setStatus(text) {
  statusEl.textContent = text;
}

function segButton(label, hint, active, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `seg${active ? ' active' : ''}`;
  btn.textContent = label;
  btn.title = hint;
  btn.addEventListener('click', onClick);
  return btn;
}

function buildSegmented(container, entries, current, onPick) {
  container.replaceChildren();
  for (const [key, value] of entries) {
    container.appendChild(segButton(
      value.label, value.hint || value.label, key === current,
      () => onPick(key),
    ));
  }
}

function refreshSegmented() {
  buildSegmented(document.getElementById('layoutSeg'), Object.entries(LAYOUTS), state.layout, (key) => {
    state.layout = key;
    fitPanelsToLayout(state);
    buildPanelList();
    render();
  });
  buildSegmented(document.getElementById('sizeSeg'), Object.entries(SIZES), state.size, (key) => {
    state.size = key;
    document.getElementById('sizeLabel').textContent = SIZES[key].label;
    render();
  });
  buildSegmented(document.getElementById('gradeSeg'), Object.entries(GRADES), state.grade, (key) => {
    state.grade = key;
    render();
  });
}

function photoThumbButton(sampleKey, panelIndex, active) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `thumb${active ? ' active' : ''}`;
  btn.title = SAMPLES[sampleKey].label;
  const img = document.createElement('img');
  img.src = SAMPLES[sampleKey].src;
  img.alt = SAMPLES[sampleKey].label;
  btn.appendChild(img);
  btn.addEventListener('click', () => {
    state.panels[panelIndex].photo = sampleKey;
    state.selected = panelIndex;
    buildPanelList();
    render();
  });
  return btn;
}

function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
}

async function setPanelPhoto(panelIndex, file) {
  try {
    const dataUrl = await readPhotoFile(file);
    state.panels[panelIndex].photo = dataUrl;
    state.selected = panelIndex;
    buildPanelList();
    await render();
    setStatus('Photo loaded into panel ' + (panelIndex + 1) + '.');
  } catch {
    setStatus('That file could not be read as a photo.');
  }
}

function buildPanelList() {
  panelList.replaceChildren();
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = `panel-card${state.selected === i ? ' selected' : ''}`;
    card.dataset.index = String(i);

    const head = document.createElement('div');
    head.className = 'panel-head';
    const name = document.createElement('span');
    name.textContent = `Panel ${i + 1}`;
    const fillAll = document.createElement('button');
    fillAll.type = 'button';
    fillAll.className = 'mini';
    fillAll.textContent = 'Use in all panels';
    fillAll.addEventListener('click', () => {
      state.panels.forEach((p) => { p.photo = panel.photo; });
      buildPanelList();
      render();
    });
    head.append(name, fillAll);
    card.appendChild(head);

    const thumbs = document.createElement('div');
    thumbs.className = 'thumbs';
    for (const key of SAMPLE_KEYS) {
      thumbs.appendChild(photoThumbButton(key, i, panel.photo === key));
    }
    const uploadLabel = document.createElement('label');
    uploadLabel.className = 'thumb upload';
    uploadLabel.textContent = '+ Photo';
    uploadLabel.title = 'Upload your own photo for this panel';
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = 'image/*';
    upload.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) await setPanelPhoto(i, file);
      e.target.value = '';
    });
    uploadLabel.appendChild(upload);
    thumbs.appendChild(uploadLabel);
    card.appendChild(thumbs);

    const zoomRow = document.createElement('label');
    zoomRow.className = 'slider-row';
    zoomRow.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '3';
    zoom.step = '0.05';
    zoom.value = String(panel.zoom);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      render();
    });
    zoomRow.appendChild(zoom);
    card.appendChild(zoomRow);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'mini';
    reset.textContent = 'Reset crop';
    reset.addEventListener('click', () => {
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      buildPanelList();
      render();
    });
    card.appendChild(reset);

    card.addEventListener('click', (e) => {
      if (e.target.closest('button, label, input')) return;
      state.selected = i;
      buildPanelList();
      render();
    });
    panelList.appendChild(card);
  });
}

async function render() {
  const size = SIZES[state.size];
  preview.width = size.w;
  preview.height = size.h;
  const ctx = preview.getContext('2d');
  try {
    photos = await loadPanelPhotos(state);
  } catch {
    setStatus('A photo failed to load; try another sample.');
    return;
  }
  drawCover(ctx, state, photos, size.w, size.h);
  // Selection outline: preview only, never part of the exported PNG, and
  // never on the cover-only shot, where the cover must stand alone.
  const rect = panelRects(state, size.w, size.h)[state.selected];
  if (rect && !document.body.classList.contains('shot-cover')) {
    ctx.save();
    ctx.strokeStyle = '#ff2d78';
    ctx.lineWidth = Math.max(3, size.w * 0.004);
    ctx.setLineDash([Math.max(8, size.w * 0.012), Math.max(6, size.w * 0.008)]);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
  refreshSegmented();
  setStatus(`Previewing ${size.w} × ${size.h} · ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label}`);
}

async function exportPng() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const ctx = off.getContext('2d');
  const images = await loadPanelPhotos(state);
  drawCover(ctx, state, images, size.w, size.h);
  const name = `cover-${state.size}.png`;
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(`Saved ${name} · ${size.w} × ${size.h} PNG.`);
  return blob;
}

// Drag on the preview to pan the photo inside its panel.
let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const rect = preview.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (preview.width / rect.width);
  const py = (e.clientY - rect.top) * (preview.height / rect.height);
  const rects = panelRects(state, preview.width, preview.height);
  const index = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  if (index === -1) return;
  state.selected = index;
  buildPanelList();
  render();
  drag = { index, startX: px, startY: py, ox: state.panels[index].ox, oy: state.panels[index].oy };
  preview.setPointerCapture(e.pointerId);
  preview.style.cursor = 'grabbing';
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = preview.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (preview.width / rect.width);
  const py = (e.clientY - rect.top) * (preview.height / rect.height);
  const panel = state.panels[drag.index];
  const r = panelRects(state, preview.width, preview.height)[drag.index];
  panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (px - drag.startX) / r.w));
  panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (py - drag.startY) / r.h));
  render();
});
function endDrag() {
  drag = null;
  preview.style.cursor = 'grab';
}
preview.addEventListener('pointerup', endDrag);
preview.addEventListener('pointercancel', endDrag);

// Drop a photo file straight onto the preview: it lands in the panel under it.
preview.addEventListener('dragover', (e) => e.preventDefault());
preview.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  const rect = preview.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (preview.width / rect.width);
  const py = (e.clientY - rect.top) * (preview.height / rect.height);
  const rects = panelRects(state, preview.width, preview.height);
  const index = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  await setPanelPhoto(index === -1 ? state.selected : index, file);
});

function wireCaptionControls() {
  const titleInput = document.getElementById('titleInput');
  const subtitleInput = document.getElementById('subtitleInput');
  const titleSize = document.getElementById('titleSize');
  const titlePos = document.getElementById('titlePos');
  const tiltRange = document.getElementById('tiltRange');
  const outlineCheck = document.getElementById('outlineCheck');

  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  titleSize.value = String(state.titleSize);
  titlePos.value = state.titlePos;
  tiltRange.value = String(state.tilt);
  outlineCheck.checked = state.outline;

  titleInput.addEventListener('input', () => { state.title = titleInput.value; render(); });
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });
  titleSize.addEventListener('input', () => { state.titleSize = Number(titleSize.value); render(); });
  titlePos.addEventListener('change', () => { state.titlePos = titlePos.value; render(); });
  tiltRange.addEventListener('input', () => { state.tilt = Number(tiltRange.value); render(); });
  outlineCheck.addEventListener('change', () => { state.outline = outlineCheck.checked; render(); });
  document.getElementById('exportBtn').addEventListener('click', exportPng);
}

async function init() {
  const mode = shotMode();
  if (mode === 'cover') document.body.classList.add('shot-cover');
  if (mode) applyShotParams(state, new URLSearchParams(location.search));
  document.getElementById('sizeLabel').textContent = SIZES[state.size].label;
  wireCaptionControls();
  buildPanelList();
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('100px "Bebas Neue"'),
        document.fonts.ready,
      ]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch {
    // The cover still draws with its fallback faces.
  }
  await render();
  window.__coverStudio = { state, render, exportPng };
  if (mode) markShotReady();
}

init();
