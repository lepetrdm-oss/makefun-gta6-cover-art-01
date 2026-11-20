// Sunset Cover Studio — editor wiring. Connects the control panel to
// the shared state and repaints the preview canvas on every change.
// Fully offline: samples are local files, uploads never leave the page.

import {
  state, SAMPLES, SIZES, LAYOUTS, GRADES,
  applyLook, setLayout, panelCount,
} from './state.js';
import { drawCover, loadPanelImages, panelShapes } from './cover.js';
import { initShots } from './shots.js';

const stage = document.getElementById('stage');
const els = {
  layoutGroup: document.getElementById('layoutGroup'),
  gradeGroup: document.getElementById('gradeGroup'),
  sizeSel: document.getElementById('sizeSel'),
  titleIn: document.getElementById('titleIn'),
  subIn: document.getElementById('subIn'),
  titleSize: document.getElementById('titleSize'),
  titleY: document.getElementById('titleY'),
  titleTilt: document.getElementById('titleTilt'),
  panelTabs: document.getElementById('panelTabs'),
  sampleRow: document.getElementById('sampleRow'),
  uploadIn: document.getElementById('uploadIn'),
  zoom: document.getElementById('zoom'),
  resetCrop: document.getElementById('resetCrop'),
  useAll: document.getElementById('useAll'),
  exportBtn: document.getElementById('exportBtn'),
};

let images = [];

function render() {
  const dim = SIZES[state.size];
  if (stage.width !== dim.w || stage.height !== dim.h) {
    stage.width = dim.w;
    stage.height = dim.h;
  }
  drawCover(stage.getContext('2d'), dim.w, dim.h, state, images);
}

async function refresh() {
  images = await loadPanelImages(state);
  render();
}

function markActive(container, attr, value) {
  container.querySelectorAll('button').forEach(function (b) {
    b.classList.toggle('active', b.dataset[attr] === String(value));
  });
}

function syncPanelControls() {
  els.panelTabs.innerHTML = '';
  state.panels.forEach(function (panel, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Panel ' + (i + 1);
    b.dataset.panel = String(i);
    if (i === state.activePanel) b.classList.add('active');
    b.addEventListener('click', function () {
      state.activePanel = i;
      syncPanelControls();
    });
    els.panelTabs.appendChild(b);
  });
  const active = state.panels[state.activePanel];
  els.zoom.value = String(active.zoom);
  markActive(els.sampleRow, 'sample', active.upload ? '' : active.sample);
}

function syncUI() {
  markActive(els.layoutGroup, 'layout', state.layout);
  markActive(els.gradeGroup, 'grade', state.grade);
  els.sizeSel.value = state.size;
  els.titleIn.value = state.title;
  els.subIn.value = state.subtitle;
  els.titleSize.value = String(state.titleSize);
  els.titleY.value = String(state.titleY);
  els.titleTilt.value = String(state.titleTilt);
  syncPanelControls();
}

function buildButtons(container, entries, attr, onPick) {
  for (const entry of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = entry.label;
    b.dataset[attr] = entry.id;
    b.addEventListener('click', function () { onPick(entry.id); });
    container.appendChild(b);
  }
}

function wire() {
  buildButtons(
    els.layoutGroup,
    Object.keys(LAYOUTS).map(function (id) { return { id: id, label: LAYOUTS[id].label }; }),
    'layout',
    async function (id) { setLayout(id); syncUI(); await refresh(); }
  );
  buildButtons(
    els.gradeGroup,
    Object.keys(GRADES).map(function (id) { return { id: id, label: GRADES[id].label }; }),
    'grade',
    function (id) { state.grade = id; syncUI(); render(); }
  );
  buildButtons(
    els.sampleRow,
    SAMPLES.map(function (s) { return { id: s.id, label: s.label }; }),
    'sample',
    async function (id) {
      const panel = state.panels[state.activePanel];
      panel.sample = id;
      panel.upload = null;
      syncPanelControls();
      await refresh();
    }
  );
  document.querySelectorAll('[data-look]').forEach(function (b) {
    b.addEventListener('click', async function () {
      applyLook(b.dataset.look);
      syncUI();
      await refresh();
    });
  });
  els.sizeSel.addEventListener('change', function () { state.size = els.sizeSel.value; render(); });
  els.titleIn.addEventListener('input', function () { state.title = els.titleIn.value; render(); });
  els.subIn.addEventListener('input', function () { state.subtitle = els.subIn.value; render(); });
  els.titleSize.addEventListener('input', function () { state.titleSize = Number(els.titleSize.value); render(); });
  els.titleY.addEventListener('input', function () { state.titleY = Number(els.titleY.value); render(); });
  els.titleTilt.addEventListener('input', function () { state.titleTilt = Number(els.titleTilt.value); render(); });
  els.zoom.addEventListener('input', function () {
    state.panels[state.activePanel].zoom = Number(els.zoom.value);
    render();
  });
  els.resetCrop.addEventListener('click', function () {
    const panel = state.panels[state.activePanel];
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    syncPanelControls();
    render();
  });
  els.useAll.addEventListener('click', async function () {
    const src = state.panels[state.activePanel];
    state.panels = state.panels.map(function () {
      return { sample: src.sample, upload: src.upload, panX: src.panX, panY: src.panY, zoom: src.zoom };
    });
    syncPanelControls();
    await refresh();
  });
  els.uploadIn.addEventListener('change', function () {
    const file = els.uploadIn.files && els.uploadIn.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function () {
      state.panels[state.activePanel].upload = String(reader.result);
      syncPanelControls();
      await refresh();
    };
    reader.readAsDataURL(file);
  });
  els.exportBtn.addEventListener('click', function () {
    const dim = SIZES[state.size];
    const out = document.createElement('canvas');
    out.width = dim.w;
    out.height = dim.h;
    drawCover(out.getContext('2d'), dim.w, dim.h, state, images);
    out.toBlob(function (blob) {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sunset-cover.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, 'image/png');
  });

  // Drag on the preview to pan the active panel's photo.
  let drag = null;
  stage.addEventListener('pointerdown', function (ev) {
    drag = { x: ev.clientX, y: ev.clientY };
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    const dim = SIZES[state.size];
    const shapes = panelShapes(state.layout, dim.w, dim.h);
    const box = shapes[state.activePanel].box;
    const rectCss = stage.getBoundingClientRect();
    const dx = ((ev.clientX - drag.x) / rectCss.width) * dim.w;
    const dy = ((ev.clientY - drag.y) / rectCss.height) * dim.h;
    drag = { x: ev.clientX, y: ev.clientY };
    const panel = state.panels[state.activePanel];
    panel.panX = Math.max(-0.5, Math.min(0.5, panel.panX + dx / box.w));
    panel.panY = Math.max(-0.5, Math.min(0.5, panel.panY + dy / box.h));
    render();
  });
  stage.addEventListener('pointerup', function () { drag = null; });
  stage.addEventListener('pointercancel', function () { drag = null; });

  // Dropping a photo file onto the preview fills the active panel.
  stage.addEventListener('dragover', function (ev) { ev.preventDefault(); });
  stage.addEventListener('drop', function (ev) {
    ev.preventDefault();
    const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function () {
      state.panels[state.activePanel].upload = String(reader.result);
      syncPanelControls();
      await refresh();
    };
    reader.readAsDataURL(file);
  });
}

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('120px Anton'),
      document.fonts.load('60px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch (err) { /* fall back to system fonts */ }
  wire();
  syncUI();
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await initShots({ applyLook: applyLook, refresh: refresh, syncUI: syncUI });
  } else {
    await refresh();
  }
}

boot();
