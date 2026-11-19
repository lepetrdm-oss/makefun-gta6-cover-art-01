// Sunset Cover Studio — the editor. Builds the controls around the preview
// canvas, owns the loaded photos (the five samples plus any photo the user
// drops in), and renders the preview and the PNG export from the one state
// in state.js. Everything is local: photos are read on this machine and
// never uploaded anywhere.

import { GRADES, LAYOUTS, LOOKS, SAMPLE_PHOTOS, SIZES, applyLook, createState, panelCount, sizeOf } from './state.js';
import { drawCover, panelPolys, pointInPoly, renderCoverCanvas } from './cover.js';
import { initShots } from './shots.js';

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const state = createState();
const images = new Map();
let fullPreview = false;

function loadPhoto(key, src) {
  if (images.has(key)) return images.get(key).promise;
  const img = new Image();
  const entry = { img, promise: null };
  entry.promise = new Promise((resolve) => {
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
  images.set(key, entry);
  return entry.promise;
}

for (const sample of SAMPLE_PHOTOS) loadPhoto(sample.id, sample.src);

function panelImages() {
  return state.panels.map((panel) => {
    const entry = images.get(panel.photo);
    return entry ? entry.img : null;
  });
}

async function whenReady() {
  const loads = SAMPLE_PHOTOS.map((sample) => loadPhoto(sample.id, sample.src));
  await Promise.all(loads);
  if (document.fonts && document.fonts.load) {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('30px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  }
}

// ------------------------------------------------------------ rendering

function render() {
  const size = sizeOf(state.size);
  const scale = fullPreview ? 1 : 0.5;
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  drawCover(ctx, canvas.width, canvas.height, state, panelImages());
  if (!document.body.classList.contains('shot-cover')) {
    const polys = panelPolys(state.layout, canvas.width, canvas.height);
    const poly = polys[state.selected];
    if (poly) {
      ctx.save();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }
}

function exportCanvas() {
  const size = sizeOf(state.size);
  return renderCoverCanvas(state, panelImages(), size.w, size.h);
}

function exportBlob() {
  return new Promise((resolve) => exportCanvas().toBlob(resolve, 'image/png'));
}

async function exportPNG() {
  const blob = await exportBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sunset-cover.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ------------------------------------------------------------ controls

function segmented(el, options, current, onPick) {
  el.innerHTML = '';
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.name;
    button.className = option.id === current ? 'active' : '';
    button.addEventListener('click', () => onPick(option.id));
    el.appendChild(button);
  }
}

function syncCaptionInputs() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('titlesize').value = String(state.titleScale);
  document.getElementById('tilt').value = String(state.tilt);
  document.getElementById('outline').checked = state.outline;
}

function buildLooks() {
  const el = document.getElementById('looks');
  el.innerHTML = '';
  for (const look of LOOKS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'look';
    button.textContent = look.name;
    button.addEventListener('click', () => {
      applyLook(state, look);
      buildPanels();
      buildSegments();
      syncCaptionInputs();
      render();
    });
    el.appendChild(button);
  }
}

function buildSegments() {
  segmented(document.getElementById('layouts'), LAYOUTS, state.layout, (id) => {
    state.layout = id;
    state.selected = Math.min(state.selected, panelCount(id) - 1);
    buildSegments();
    buildPanels();
    render();
  });
  segmented(document.getElementById('sizes'), SIZES, state.size, (id) => {
    state.size = id;
    buildSegments();
    render();
  });
  segmented(
    document.getElementById('grades'),
    Object.entries(GRADES).map(([id, g]) => ({ id, name: g.name })),
    state.grade,
    (id) => {
      state.grade = id;
      buildSegments();
      render();
    },
  );
  segmented(
    document.getElementById('titlepos'),
    [
      { id: 'top', name: 'Top' },
      { id: 'middle', name: 'Middle' },
      { id: 'bottom', name: 'Bottom' },
    ],
    state.titlePos,
    (id) => {
      state.titlePos = id;
      buildSegments();
      render();
    },
  );
}

function setPanelPhoto(index, key) {
  state.panels[index].photo = key;
  state.panels[index].zoom = 1;
  state.panels[index].ox = 0;
  state.panels[index].oy = 0;
  state.selected = index;
  buildPanels();
  render();
}

function buildPanels() {
  const el = document.getElementById('panels');
  el.innerHTML = '';
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const card = document.createElement('div');
    card.className = 'panel-card' + (i === state.selected ? ' selected' : '');

    const head = document.createElement('div');
    head.className = 'panel-head';
    const name = document.createElement('span');
    name.textContent = `Panel ${i + 1}`;
    const all = document.createElement('button');
    all.type = 'button';
    all.textContent = 'Use in all panels';
    all.addEventListener('click', () => {
      for (const other of state.panels) other.photo = panel.photo;
      buildPanels();
      render();
    });
    head.append(name, all);

    const thumbs = document.createElement('div');
    thumbs.className = 'thumbs';
    for (const sample of SAMPLE_PHOTOS) {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'thumb' + (panel.photo === sample.id ? ' active' : '');
      thumb.title = sample.label;
      const img = document.createElement('img');
      img.src = sample.src;
      img.alt = sample.label;
      thumb.appendChild(img);
      thumb.addEventListener('click', () => setPanelPhoto(i, sample.id));
      thumbs.appendChild(thumb);
    }

    const row = document.createElement('div');
    row.className = 'panel-row';
    const upload = document.createElement('label');
    upload.className = 'upload';
    upload.textContent = panel.photo.startsWith('upload-') ? 'Your photo ✓' : 'Upload';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', () => {
      if (file.files && file.files[0]) readUpload(i, file.files[0]);
    });
    upload.appendChild(file);
    const zoomLabel = document.createElement('label');
    zoomLabel.className = 'zoom';
    zoomLabel.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.6';
    zoom.step = '0.01';
    zoom.value = String(panel.zoom);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      render();
    });
    zoomLabel.appendChild(zoom);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset crop';
    reset.addEventListener('click', () => {
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      buildPanels();
      render();
    });
    row.append(upload, zoomLabel, reset);

    card.append(head, thumbs, row);
    card.addEventListener('pointerdown', () => {
      if (state.selected !== i) {
        state.selected = i;
        buildPanels();
        render();
      }
    });
    el.appendChild(card);
  }
}

function readUpload(index, file) {
  const reader = new FileReader();
  reader.onload = () => {
    const key = `upload-${Date.now()}-${index}`;
    loadPhoto(key, String(reader.result)).then(() => setPanelPhoto(index, key));
  };
  reader.readAsDataURL(file);
}

// ------------------------------------------------------------ canvas input

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return [
    ((event.clientX - rect.left) / rect.width) * canvas.width,
    ((event.clientY - rect.top) / rect.height) * canvas.height,
  ];
}

function panelAt(x, y) {
  const polys = panelPolys(state.layout, canvas.width, canvas.height);
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    if (pointInPoly(x, y, polys[i])) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const [x, y] = canvasPoint(event);
  const index = panelAt(x, y);
  if (index < 0) return;
  state.selected = index;
  drag = { index, x, y };
  canvas.setPointerCapture(event.pointerId);
  buildPanels();
  render();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const [x, y] = canvasPoint(event);
  const panel = state.panels[drag.index];
  panel.ox = Math.max(-1, Math.min(1, panel.ox + ((x - drag.x) / canvas.width) * 2.2));
  panel.oy = Math.max(-1, Math.min(1, panel.oy + ((y - drag.y) / canvas.height) * 2.2));
  drag.x = x;
  drag.y = y;
  render();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});
canvas.addEventListener('dragover', (event) => event.preventDefault());
canvas.addEventListener('drop', (event) => {
  event.preventDefault();
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) return;
  const [x, y] = canvasPoint(event);
  const index = panelAt(x, y);
  readUpload(index >= 0 ? index : state.selected, file);
});

// ------------------------------------------------------------ wiring

document.getElementById('title').addEventListener('input', (event) => {
  state.title = event.target.value;
  render();
});
document.getElementById('subtitle').addEventListener('input', (event) => {
  state.subtitle = event.target.value;
  render();
});
document.getElementById('titlesize').addEventListener('input', (event) => {
  state.titleScale = Number(event.target.value);
  render();
});
document.getElementById('tilt').addEventListener('input', (event) => {
  state.tilt = Number(event.target.value);
  render();
});
document.getElementById('outline').addEventListener('change', (event) => {
  state.outline = event.target.checked;
  render();
});
document.getElementById('export').addEventListener('click', exportPNG);

const app = {
  state,
  render,
  whenReady,
  exportBlob,
  exportCanvas,
  applyLookById(id) {
    const look = LOOKS.find((l) => l.id === id);
    if (look) {
      applyLook(state, look);
      buildPanels();
      buildSegments();
      syncCaptionInputs();
      render();
    }
  },
  setFullPreview(on) {
    fullPreview = on;
    render();
  },
  refresh() {
    buildPanels();
    buildSegments();
    syncCaptionInputs();
    render();
  },
};
window.__app = app;

buildLooks();
buildSegments();
buildPanels();
syncCaptionInputs();
render();
whenReady().then(() => render());
initShots(app);
