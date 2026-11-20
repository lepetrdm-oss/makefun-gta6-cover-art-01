// Sunset Cover Studio — editor wiring: controls, uploads, drag/zoom,
// exports. Rendering itself lives in cover.js; data in state.js.

'use strict';

const state = defaultState();
const images = {};   // sampleId or 'upload:<id>' -> HTMLImageElement
let uploadSeq = 0;

const $ = (sel) => document.querySelector(sel);
const poster = $('#poster');
const pctx = poster.getContext('2d');

function render() {
  const [W, H] = state.size;
  if (poster.width !== W) poster.width = W;
  if (poster.height !== H) poster.height = H;
  renderPoster(pctx, state, images, W, H, { editor: !document.body.classList.contains('shot') });
}

function loadSampleImages() {
  SAMPLES.forEach((s) => {
    const img = new Image();
    img.onload = () => render();
    img.src = s.src;
    images[s.id] = img;
  });
}

// ---- uploads + saliency focal point ---------------------------------------

function saliencyFocal(img) {
  const tw = 96;
  const th = Math.max(1, Math.round((tw * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement('canvas');
  c.width = tw;
  c.height = th;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, tw, th);
  const data = x.getImageData(0, 0, tw, th).data;
  const lum = new Float32Array(tw * th);
  for (let i = 0; i < tw * th; i++) {
    lum[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
  }
  const cell = 8;
  const gw = Math.ceil(tw / cell);
  const gh = Math.ceil(th / cell);
  const scores = new Float32Array(gw * gh);
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      let s = 0;
      let cnt = 0;
      for (let yy = cy * cell; yy < Math.min(th, (cy + 1) * cell); yy++) {
        for (let xx = cx * cell; xx < Math.min(tw, (cx + 1) * cell); xx++) {
          const i = yy * tw + xx;
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          let wgt = 0;
          // skin-tone likeness
          if (r > 90 && g > 38 && b > 18 && r > g && r > b && Math.abs(r - g) > 14) wgt += 2.2;
          // local contrast (edges carry subjects)
          const right = xx + 1 < tw ? lum[i + 1] : lum[i];
          const down = yy + 1 < th ? lum[i + tw] : lum[i];
          wgt += Math.min(1.4, (Math.abs(lum[i] - right) + Math.abs(lum[i] - down)) / 90);
          s += wgt;
          cnt++;
        }
      }
      // gentle centre bias so empty skies do not win
      const dx = cx / gw - 0.5;
      const dy = cy / gh - 0.42;
      scores[cy * gw + cx] = (s / cnt) * (1 - 0.25 * (dx * dx + dy * dy) * 4);
    }
  }
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  const thresh = scores[best] * 0.72;
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      const v = scores[cy * gw + cx];
      if (v >= thresh) {
        sx += (cx + 0.5) * v;
        sy += (cy + 0.5) * v;
        sw += v;
      }
    }
  }
  if (!sw) return { x: 0.5, y: 0.42 };
  return { x: clamp(sx / sw / gw, 0.05, 0.95), y: clamp(sy / sw / gh, 0.05, 0.95) };
}

function handleUpload(panelIdx, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const id = 'u' + (++uploadSeq);
      state.uploads[id] = {
        src: reader.result,
        focal: saliencyFocal(img),
        w: img.naturalWidth,
        h: img.naturalHeight,
      };
      images['upload:' + id] = img;
      state.panels[panelIdx].upload = id;
      state.panels[panelIdx].pan = { x: 0, y: 0 };
      state.panels[panelIdx].zoom = 1;
      buildPanelControls();
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ---- controls --------------------------------------------------------------

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function labelled(labelText, input) {
  const wrap = el('label', 'field');
  wrap.appendChild(el('span', 'field-label', labelText));
  wrap.appendChild(input);
  return wrap;
}

function textInput(value, oninput) {
  const i = document.createElement('input');
  i.type = 'text';
  i.value = value;
  i.addEventListener('input', () => oninput(i.value));
  return i;
}

function selectInput(options, value, onchange) {
  const s = document.createElement('select');
  options.forEach(([v, label]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    s.appendChild(o);
  });
  s.value = value;
  s.addEventListener('change', () => onchange(s.value));
  return s;
}

function toggleInput(checked, onchange) {
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.checked = checked;
  i.addEventListener('change', () => onchange(i.checked));
  return i;
}

function buildPanelControls() {
  const host = $('#panels');
  host.innerHTML = '';
  const n = panelCount(state);
  for (let i = 0; i < n; i++) {
    const panel = state.panels[i];
    const card = el('div', 'panel-card' + (state.selected === i ? ' active' : ''));
    const head = el('button', 'panel-head', 'Panel ' + (i + 1) + (panel.upload ? ' · upload' : ' · ' + sampleById(panel.sample).label));
    head.type = 'button';
    head.addEventListener('click', () => { state.selected = i; buildPanelControls(); render(); });
    card.appendChild(head);

    const sampleSel = selectInput(
      SAMPLES.map((s) => [s.id, s.label]),
      panel.sample,
      (v) => { panel.sample = v; panel.upload = null; buildPanelControls(); render(); }
    );
    card.appendChild(labelled('Photo', sampleSel));

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.addEventListener('change', () => handleUpload(i, file.files[0]));
    card.appendChild(labelled('Upload your own', file));

    card.appendChild(labelled('Cast name', textInput(panel.name, (v) => { panel.name = v; render(); })));
    card.appendChild(labelled('Role tag', textInput(panel.tag, (v) => { panel.tag = v; render(); })));

    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.01';
    zoom.value = String(panel.zoom);
    zoom.addEventListener('input', () => { panel.zoom = parseFloat(zoom.value); render(); });
    card.appendChild(labelled('Zoom', zoom));

    const row = el('div', 'btn-row');
    const reset = el('button', 'mini', 'Reset framing');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      panel.pan = { x: 0, y: 0 };
      panel.zoom = 1;
      buildPanelControls();
      render();
    });
    const all = el('button', 'mini', 'Use in all panels');
    all.type = 'button';
    all.addEventListener('click', () => {
      state.panels.forEach((p) => {
        p.sample = panel.sample;
        p.upload = panel.upload;
        p.pan = { x: 0, y: 0 };
        p.zoom = 1;
      });
      buildPanelControls();
      render();
    });
    row.appendChild(reset);
    row.appendChild(all);
    card.appendChild(row);
    host.appendChild(card);
  }
}

function syncStaticControls() {
  $('#look-select').value = '';
  $('#layout-select').value = state.layout;
  $('#grade-select').value = state.grade;
  $('#frame-style').value = state.frameStyle;
  $('#size-select').value = state.size.join('x');
  $('#title-input').value = state.title;
  $('#subtitle-input').value = state.subtitle;
  $('#billing-input').value = state.billing;
  $('#tags-toggle').checked = state.tagsOn;
  $('#frame-toggle').checked = state.frameOn;
  $('#autoframe-toggle').checked = state.autoFrame;
  $('#print-toggle').checked = state.printTexture;
  state.quotes.forEach((item, i) => {
    $('#quote-' + i).value = item.q;
    $('#pub-' + i).value = item.p;
  });
}

function buildStaticControls() {
  const lookSel = $('#look-select');
  Object.entries(LOOKS).forEach(([key, look]) => {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = look.label;
    lookSel.appendChild(o);
  });
  lookSel.addEventListener('change', () => {
    if (!lookSel.value) return;
    applyLook(state, lookSel.value);
    syncStaticControls();
    buildPanelControls();
    render();
  });

  const layoutSel = $('#layout-select');
  Object.entries(LAYOUTS).forEach(([key, l]) => {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = l.label;
    layoutSel.appendChild(o);
  });
  layoutSel.addEventListener('change', () => {
    state.layout = layoutSel.value;
    if (state.selected >= panelCount(state)) state.selected = 0;
    buildPanelControls();
    render();
  });

  const gradeSel = $('#grade-select');
  Object.entries(GRADES).forEach(([key, g]) => {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = g.label;
    gradeSel.appendChild(o);
  });
  gradeSel.addEventListener('change', () => { state.grade = gradeSel.value; render(); });

  const frameSel = $('#frame-style');
  Object.entries(FRAME_STYLES).forEach(([key, f]) => {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = f.label;
    frameSel.appendChild(o);
  });
  frameSel.addEventListener('change', () => { state.frameStyle = frameSel.value; render(); });

  const sizeSel = $('#size-select');
  ['1920x1080', '1080x1350', '1080x1080'].forEach((v) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v.replace('x', ' × ');
    sizeSel.appendChild(o);
  });
  sizeSel.addEventListener('change', () => {
    state.size = sizeSel.value.split('x').map(Number);
    render();
  });

  $('#title-input').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('#subtitle-input').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('#billing-input').addEventListener('input', (e) => { state.billing = e.target.value; render(); });
  state.quotes.forEach((item, i) => {
    $('#quote-' + i).addEventListener('input', (e) => { state.quotes[i].q = e.target.value.toUpperCase(); render(); });
    $('#pub-' + i).addEventListener('input', (e) => { state.quotes[i].p = e.target.value.toUpperCase(); render(); });
  });
  $('#tags-toggle').addEventListener('change', (e) => { state.tagsOn = e.target.checked; render(); });
  $('#frame-toggle').addEventListener('change', (e) => { state.frameOn = e.target.checked; render(); });
  $('#autoframe-toggle').addEventListener('change', (e) => { state.autoFrame = e.target.checked; render(); });
  $('#print-toggle').addEventListener('change', (e) => { state.printTexture = e.target.checked; render(); });

  document.querySelectorAll('.export-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.size.split('x').map(Number);
      exportPNG(w, h);
    });
  });
}

function exportPNG(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  renderPoster(c.getContext('2d'), state, images, w, h, { editor: false });
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sunset-cover-' + w + 'x' + h + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---- canvas interaction -----------------------------------------------------

function canvasPoint(evt) {
  const r = poster.getBoundingClientRect();
  return {
    x: ((evt.clientX - r.left) / r.width) * poster.width,
    y: ((evt.clientY - r.top) / r.height) * poster.height,
  };
}

function hitPanel(pt) {
  const rects = panelRects(state, poster.width, poster.height);
  const n = panelCount(state);
  for (let i = n - 1; i >= 0; i--) {
    const b = rects[i].bounds;
    if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) return i;
  }
  return -1;
}

let drag = null;
poster.addEventListener('pointerdown', (evt) => {
  const pt = canvasPoint(evt);
  const idx = hitPanel(pt);
  if (idx < 0) return;
  if (state.selected !== idx) {
    state.selected = idx;
    buildPanelControls();
    render();
  }
  drag = { idx, startX: evt.clientX, startY: evt.clientY, pan: { ...state.panels[idx].pan } };
  poster.setPointerCapture(evt.pointerId);
});
poster.addEventListener('pointermove', (evt) => {
  if (!drag) return;
  const r = poster.getBoundingClientRect();
  const panel = state.panels[drag.idx];
  panel.pan.x = clamp(drag.pan.x - ((evt.clientX - drag.startX) / r.width) * 2.2, -1, 1);
  panel.pan.y = clamp(drag.pan.y - ((evt.clientY - drag.startY) / r.height) * 2.2, -1, 1);
  render();
});
poster.addEventListener('pointerup', () => { drag = null; });
poster.addEventListener('wheel', (evt) => {
  evt.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = clamp(panel.zoom * (evt.deltaY < 0 ? 1.06 : 0.94), 1, 2.5);
  buildPanelControls();
  render();
}, { passive: false });

// ---- boot -------------------------------------------------------------------

buildStaticControls();
syncStaticControls();
buildPanelControls();
loadSampleImages();
render();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());

// API for shots.js (deterministic screenshot modes).
window.__studio = {
  state,
  images,
  render,
  applyLook(name) {
    applyLook(state, name);
    syncStaticControls();
    buildPanelControls();
    render();
  },
  allSamplesLoaded() {
    return SAMPLES.every((s) => images[s.id] && images[s.id].complete && images[s.id].naturalWidth > 0);
  },
  exportPNG,
};
