// Sunset Cover Studio — main.js
// The editor UI: builds the control groups (Looks, layout, post size, grade,
// caption, per-panel photo cards), wires them to the state, renders the
// preview through cover.js, and exports the cover as a PNG at the chosen
// post size. Runs entirely offline from the app's own files.

const state = StudioState.defaultState();
StudioShots.applyTo(state);

const imageCache = new Map();
let lastImages = [];
let drag = null;

function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return imageCache.get(src);
}

function sampleSrc(id) {
  const sample = StudioData.samples.find((s) => s.id === id);
  return sample ? sample.src : StudioData.samples[0].src;
}

// The loaded image for every panel slot (null where one failed to load).
async function collectImages() {
  const jobs = state.panels.map((panel) => loadImage(panel.custom || sampleSrc(panel.sample)));
  lastImages = await Promise.all(jobs);
  return lastImages;
}

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');

async function render() {
  const size = StudioData.sizes[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  const images = await collectImages();
  StudioCover.drawCover(ctx, size.w, size.h, state, images);
  // The selection outline is an editor aid only; exports never show it.
  if (!StudioShots.mode || StudioShots.mode === 'editor') {
    const polys = StudioCover.panelPolys(state.layout);
    const poly = polys[state.selected];
    if (poly) {
      ctx.save();
      ctx.setLineDash([size.w * 0.008, size.w * 0.006]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, size.w * 0.0018);
      ctx.beginPath();
      poly.forEach(([ux, uy], i) => {
        if (i === 0) ctx.moveTo(ux * size.w, uy * size.h);
        else ctx.lineTo(ux * size.w, uy * size.h);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }
}

// The app's real export: the cover painted at full post size on an offscreen
// canvas, returned as a PNG data URL. The Export button downloads exactly
// these bytes.
async function renderExportDataURL() {
  const size = StudioData.sizes[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const images = await collectImages();
  StudioCover.drawCover(off.getContext('2d'), size.w, size.h, state, images);
  return off.toDataURL('image/png');
}
window.__exportDataURL = renderExportDataURL;

// ---- control builders -------------------------------------------------

function segButtons(container, entries, current, onPick) {
  container.innerHTML = '';
  for (const [value, label] of entries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.className = 'seg-btn' + (value === current ? ' active' : '');
    btn.addEventListener('click', () => onPick(value));
    container.appendChild(btn);
  }
}

function buildLooks() {
  segButtons(
    document.getElementById('looks'),
    Object.entries(StudioData.looks).map(([id, look]) => [id, look.label]),
    '',
    (id) => {
      StudioState.applyLook(state, id);
      syncControls();
      render();
    },
  );
}

function buildSegs() {
  segButtons(
    document.getElementById('layouts'),
    Object.entries(StudioData.layouts).map(([id, l]) => [id, l.label]),
    state.layout,
    (id) => {
      state.layout = id;
      state.selected = 0;
      buildSegs();
      buildPanels();
      render();
    },
  );
  segButtons(
    document.getElementById('sizes'),
    Object.entries(StudioData.sizes).map(([id, s]) => [id, s.label]),
    state.size,
    (id) => {
      state.size = id;
      buildSegs();
      render();
    },
  );
  segButtons(
    document.getElementById('grades'),
    Object.entries(StudioData.grades).map(([id, g]) => [id, g.label]),
    state.grade,
    (id) => {
      state.grade = id;
      buildSegs();
      render();
    },
  );
  segButtons(
    document.getElementById('title-pos'),
    [
      ['top', 'Top'],
      ['middle', 'Middle'],
      ['bottom', 'Bottom'],
    ],
    state.titlePos,
    (id) => {
      state.titlePos = id;
      buildSegs();
      render();
    },
  );
}

function buildPanels() {
  const wrap = document.getElementById('panels');
  wrap.innerHTML = '';
  const count = StudioState.layoutPanelCount(state);
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const card = document.createElement('div');
    card.className = 'panel-card' + (state.selected === i ? ' selected' : '');

    const head = document.createElement('div');
    head.className = 'panel-head';
    head.textContent = `Panel ${i + 1}`;
    head.addEventListener('click', () => {
      state.selected = i;
      buildPanels();
      render();
    });
    card.appendChild(head);

    const thumbs = document.createElement('div');
    thumbs.className = 'thumbs';
    for (const sample of StudioData.samples) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'thumb' + (!panel.custom && panel.sample === sample.id ? ' active' : '');
      t.title = sample.label;
      const im = document.createElement('img');
      im.src = sample.src;
      im.alt = sample.label;
      t.appendChild(im);
      t.addEventListener('click', () => {
        panel.sample = sample.id;
        panel.custom = null;
        state.selected = i;
        buildPanels();
        render();
      });
      thumbs.appendChild(t);
    }
    card.appendChild(thumbs);

    const row = document.createElement('div');
    row.className = 'panel-row';
    const upload = document.createElement('label');
    upload.className = 'upload-btn';
    upload.textContent = panel.custom ? 'Own photo ✓' : 'Upload photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', () => {
      if (file.files && file.files[0]) readUpload(panel, file.files[0]);
    });
    upload.appendChild(file);
    row.appendChild(upload);

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'mini-btn';
    all.textContent = 'Use in all panels';
    all.addEventListener('click', () => {
      for (const p of state.panels) {
        p.sample = panel.sample;
        p.custom = panel.custom;
      }
      buildPanels();
      render();
    });
    row.appendChild(all);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'mini-btn';
    reset.textContent = 'Reset crop';
    reset.addEventListener('click', () => {
      panel.zoom = 1;
      panel.ox = 0.5;
      panel.oy = 0.5;
      buildPanels();
      render();
    });
    row.appendChild(reset);
    card.appendChild(row);

    const zoomRow = document.createElement('label');
    zoomRow.className = 'zoom-row';
    zoomRow.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.01';
    zoom.value = String(panel.zoom);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      render();
    });
    zoomRow.appendChild(zoom);
    card.appendChild(zoomRow);

    card.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      card.classList.add('dragover');
    });
    card.addEventListener('dragleave', () => card.classList.remove('dragover'));
    card.addEventListener('drop', (ev) => {
      ev.preventDefault();
      card.classList.remove('dragover');
      const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) readUpload(panel, f);
    });

    wrap.appendChild(card);
  }
}

function readUpload(panel, file) {
  const reader = new FileReader();
  reader.onload = () => {
    panel.custom = String(reader.result);
    buildPanels();
    render();
  };
  reader.readAsDataURL(file);
}

function syncCaptionInputs() {
  document.getElementById('title-input').value = state.title;
  document.getElementById('subtitle-input').value = state.subtitle;
  document.getElementById('title-size').value = String(state.titleSize);
  document.getElementById('tilt').value = String(state.tilt);
  document.getElementById('outline-toggle').checked = state.outline;
}

function syncControls() {
  buildSegs();
  buildPanels();
  syncCaptionInputs();
}

// ---- drag to pan --------------------------------------------------------

function canvasUnitPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return [(ev.clientX - rect.left) / rect.width, (ev.clientY - rect.top) / rect.height];
}

canvas.addEventListener('pointerdown', (ev) => {
  const [ux, uy] = canvasUnitPoint(ev);
  const polys = StudioCover.panelPolys(state.layout);
  const count = StudioState.layoutPanelCount(state);
  for (let i = 0; i < count; i++) {
    if (StudioCover.pointInPoly(ux, uy, polys[i])) {
      state.selected = i;
      drag = { panel: i, x: ev.clientX, y: ev.clientY };
      canvas.setPointerCapture(ev.pointerId);
      buildPanels();
      render();
      break;
    }
  }
});

canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const panel = state.panels[drag.panel];
  const img = lastImages[drag.panel];
  if (!img) return;
  const size = StudioData.sizes[state.size];
  const rect = canvas.getBoundingClientRect();
  const polys = StudioCover.panelPolys(state.layout);
  const bb = StudioCover.panelBBox(polys[drag.panel]);
  const bw = bb.w * size.w;
  const bh = bb.h * size.h;
  const scale = Math.max(bw / img.width, bh / img.height) * panel.zoom;
  const overflowX = img.width * scale - bw;
  const overflowY = img.height * scale - bh;
  const dx = ((ev.clientX - drag.x) / rect.width) * size.w;
  const dy = ((ev.clientY - drag.y) / rect.height) * size.h;
  if (overflowX > 0) panel.ox = Math.min(1, Math.max(0, panel.ox - dx / overflowX));
  if (overflowY > 0) panel.oy = Math.min(1, Math.max(0, panel.oy - dy / overflowY));
  drag.x = ev.clientX;
  drag.y = ev.clientY;
  render();
});

canvas.addEventListener('pointerup', () => {
  drag = null;
});

// ---- caption + export wiring ---------------------------------------------

function wireCaption() {
  document.getElementById('title-input').addEventListener('input', (ev) => {
    state.title = ev.target.value;
    render();
  });
  document.getElementById('subtitle-input').addEventListener('input', (ev) => {
    state.subtitle = ev.target.value;
    render();
  });
  document.getElementById('title-size').addEventListener('input', (ev) => {
    state.titleSize = Number(ev.target.value);
    render();
  });
  document.getElementById('tilt').addEventListener('input', (ev) => {
    state.tilt = Number(ev.target.value);
    render();
  });
  document.getElementById('outline-toggle').addEventListener('change', (ev) => {
    state.outline = ev.target.checked;
    render();
  });
  document.getElementById('export-btn').addEventListener('click', async () => {
    const url = await renderExportDataURL();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sunset-cover.png';
    a.click();
  });
}

// ---- init -----------------------------------------------------------------

async function init() {
  buildLooks();
  buildSegs();
  buildPanels();
  syncCaptionInputs();
  wireCaption();
  try {
    await Promise.race([
      Promise.all([document.fonts.load('80px Anton'), document.fonts.load('40px "Bebas Neue"'), document.fonts.ready]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // Fonts fall back to the bundled files' default rendering; keep going.
  }
  await collectImages();
  await render();
  if (StudioShots.mode) {
    document.body.classList.add(StudioShots.mode === 'cover' ? 'shot-cover' : 'shot-editor');
    window.__shotReady = true;
  }
}

init();
