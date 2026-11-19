// Sunset Cover Studio — state: layouts, grades, sizes, one-click looks and
// the cover's panel data. No network, no storage: every value lives in this
// module's state object.

export const SIZES = {
  '1080x1080': { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

// A layout is either `panels` (axis-aligned rectangles as [x, y, w, h]
// fractions, with a gutter drawn between them) or `polys` (one polygon per
// panel as [x, y] fraction points, the fractions already holding the gap
// between neighbours, so the dividers come out angled).
export const LAYOUTS = {
  hero: {
    label: 'One photo',
    hint: 'A single full-bleed photo',
    panels: [[0, 0, 1, 1]],
  },
  duo: {
    label: 'Hero + two',
    hint: 'One big panel, two small',
    panels: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  trio: {
    label: 'Three panels',
    hint: 'Three tall columns',
    panels: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
  },
  slant: {
    label: 'Slanted trio',
    hint: 'Three columns, angled dividers',
    polys: [
      [[0, 0], [0.352, 0], [0.292, 1], [0, 1]],
      [[0.37, 0], [0.698, 0], [0.638, 1], [0.31, 1]],
      [[0.716, 0], [1, 0], [1, 1], [0.656, 1]],
    ],
  },
  grid: {
    label: 'Four panels',
    hint: 'A two-by-two grid',
    panels: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
};

export function layoutPanelCount(layoutKey) {
  const layout = LAYOUTS[layoutKey];
  return (layout.polys || layout.panels).length;
}

// Each grade carries its photo filter, a multi-stop sunset wash laid over
// the panels, top and bottom tints, the sun it draws ('striped' is the
// retro banded disc, 'ring' the neon rings, 'none' no sun), the title's
// gradient colours and the accent the lettering and panel edges use.
export const GRADES = {
  vice: {
    label: 'Vice Sunset',
    hint: 'Pink-orange dusk',
    photoFilter: 'saturate(1.4) contrast(1.1)',
    wash: [
      [0, 'rgba(43, 0, 84, 0.42)'],
      [0.42, 'rgba(255, 45, 120, 0.16)'],
      [0.72, 'rgba(255, 94, 98, 0.20)'],
      [1, 'rgba(255, 154, 61, 0.34)'],
    ],
    topTint: 'rgba(255, 94, 98, 0.10)',
    bottomTint: 'rgba(255, 45, 120, 0.30)',
    sun: 'striped',
    sunStops: ['#ffe259', '#ffa751', '#ff5e62', '#ff2d78'],
    titleFill: '#ffffff',
    titleFill2: '#ffc7dd',
    titleStroke: '#20063a',
    accent: '#ff2d78',
    panelEdge: 'rgba(255, 255, 255, 0.85)',
  },
  neon: {
    label: 'Neon Nights',
    hint: 'Cyan and magenta glow',
    photoFilter: 'saturate(1.55) contrast(1.16) brightness(0.94)',
    wash: [
      [0, 'rgba(2, 0, 48, 0.46)'],
      [0.5, 'rgba(140, 0, 120, 0.18)'],
      [1, 'rgba(0, 70, 110, 0.34)'],
    ],
    topTint: 'rgba(0, 229, 255, 0.10)',
    bottomTint: 'rgba(255, 0, 128, 0.32)',
    sun: 'ring',
    sunStops: ['#aefcff', '#00e5ff', '#ff2d78'],
    titleFill: '#ffffff',
    titleFill2: '#bdefff',
    titleStroke: '#0b1030',
    accent: '#00e5ff',
    panelEdge: 'rgba(0, 229, 255, 0.75)',
  },
  gold: {
    label: 'Golden Hour',
    hint: 'Warm amber light',
    photoFilter: 'sepia(0.3) saturate(1.55) contrast(1.07)',
    wash: [
      [0, 'rgba(59, 20, 0, 0.40)'],
      [0.5, 'rgba(255, 110, 0, 0.16)'],
      [1, 'rgba(255, 176, 0, 0.32)'],
    ],
    topTint: 'rgba(255, 176, 0, 0.10)',
    bottomTint: 'rgba(255, 110, 0, 0.28)',
    sun: 'striped',
    sunStops: ['#fff3b0', '#ffd166', '#ff9a3d', '#ff6b35'],
    titleFill: '#fff8e7',
    titleFill2: '#ffd166',
    titleStroke: '#3a1c00',
    accent: '#ffb000',
    panelEdge: 'rgba(255, 248, 231, 0.85)',
  },
  noir: {
    label: 'Noir',
    hint: 'Black and white',
    photoFilter: 'grayscale(1) contrast(1.28) brightness(0.96)',
    wash: [
      [0, 'rgba(0, 0, 0, 0.42)'],
      [0.5, 'rgba(70, 70, 70, 0.14)'],
      [1, 'rgba(0, 0, 0, 0.48)'],
    ],
    topTint: 'rgba(255, 255, 255, 0.05)',
    bottomTint: 'rgba(0, 0, 0, 0.38)',
    sun: 'none',
    sunStops: ['#ffffff', '#bbbbbb'],
    titleFill: '#ffffff',
    titleFill2: '#cfcfcf',
    titleStroke: '#000000',
    accent: '#ffffff',
    panelEdge: 'rgba(255, 255, 255, 0.9)',
  },
};

// Sample photos shipped with the app. They were made with an image model
// for this project and are free to use; a person's own photos are read
// locally and never uploaded.
export const SAMPLES = {
  boulevard: { label: 'Boulevard', src: 'samples/boulevard.jpg' },
  convertible: { label: 'Convertible', src: 'samples/convertible.jpg' },
  'neon-street': { label: 'Neon Street', src: 'samples/neon-street.jpg' },
  lifeguard: { label: 'Lifeguard Tower', src: 'samples/lifeguard.jpg' },
  pier: { label: 'Pier', src: 'samples/pier.jpg' },
};

export const SAMPLE_KEYS = Object.keys(SAMPLES);

// One-click looks: a curated layout, grade, size, caption and photo set, so
// a first-time user gets a finished cover in a single click and can then
// make it their own.
export const PRESETS = {
  keyart: {
    label: 'Key Art',
    hint: 'Slanted panels · Vice Sunset · wide',
    layout: 'slant',
    grade: 'vice',
    size: '1920x1080',
    title: 'Sunset Heist',
    subtitle: 'Sunset Coast · Summer',
    titlePos: 'bottom',
    titleSize: 1.08,
    tilt: -2,
    photos: ['boulevard', 'convertible', 'neon-street'],
  },
  neonportrait: {
    label: 'Neon Portrait',
    hint: 'Three panels · Neon Nights · portrait',
    layout: 'trio',
    grade: 'neon',
    size: '1080x1350',
    title: 'Boulevard Queen',
    subtitle: 'Ocean Drive · After Dark',
    titlePos: 'bottom',
    titleSize: 1,
    tilt: -2,
    photos: ['boulevard', 'neon-street', 'lifeguard'],
  },
  goldgrid: {
    label: 'Golden Grid',
    hint: 'Four panels · Golden Hour · square',
    layout: 'grid',
    grade: 'gold',
    size: '1080x1080',
    title: 'Neon Nights',
    subtitle: 'Golden Hour · Vice Coast',
    titlePos: 'bottom',
    titleSize: 1,
    tilt: -2,
    photos: ['convertible', 'neon-street', 'boulevard', 'lifeguard'],
  },
};

export const PRESET_KEYS = Object.keys(PRESETS);

export function defaultPanel(photo) {
  return { photo, zoom: 1, ox: 0, oy: 0 };
}

export function applyPreset(state, key) {
  const preset = PRESETS[key];
  if (!preset) return;
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.size = preset.size;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  state.titlePos = preset.titlePos;
  state.titleSize = preset.titleSize;
  state.tilt = preset.tilt;
  state.outline = true;
  state.panels = preset.photos.map((photo) => defaultPanel(photo));
  state.selected = 0;
}

export function defaultState() {
  const state = {
    size: '1920x1080',
    layout: 'slant',
    grade: 'vice',
    title: 'Sunset Heist',
    subtitle: 'Sunset Coast · Summer',
    titleSize: 1.08,
    titlePos: 'bottom',
    tilt: -2,
    outline: true,
    panels: [
      defaultPanel('boulevard'),
      defaultPanel('convertible'),
      defaultPanel('neon-street'),
    ],
    selected: 0,
  };
  return state;
}

// Fit the panel list to a layout: keep the panels that still exist, fill new
// ones with the sample photos in turn.
export function fitPanelsToLayout(state) {
  const count = layoutPanelCount(state.layout);
  const next = [];
  for (let i = 0; i < count; i += 1) {
    if (state.panels[i]) {
      next.push(state.panels[i]);
    } else {
      next.push(defaultPanel(SAMPLE_KEYS[i % SAMPLE_KEYS.length]));
    }
  }
  state.panels = next;
  if (state.selected >= count) state.selected = 0;
}

// Photos are loaded once and cached by source. A sample key resolves to its
// shipped file; anything else is treated as a data URL from an upload.
const photoCache = new Map();

export function loadPhoto(photo) {
  const src = SAMPLES[photo] ? SAMPLES[photo].src : photo;
  if (!photoCache.has(src)) {
    const pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`could not load photo ${src}`));
      img.src = src;
    });
    photoCache.set(src, pending);
  }
  return photoCache.get(src);
}

export function loadPanelPhotos(state) {
  return Promise.all(state.panels.map((panel) => loadPhoto(panel.photo)));
}
