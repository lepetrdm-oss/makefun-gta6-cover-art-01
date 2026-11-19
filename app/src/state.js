// Sunset Cover Studio — state: layouts, grades, sizes and the cover's panel data.
// No network, no storage: every value lives in this module's state object.

export const SIZES = {
  '1080x1080': { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

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

export const GRADES = {
  vice: {
    label: 'Vice Sunset',
    hint: 'Pink-orange dusk',
    photoFilter: 'saturate(1.35) contrast(1.08)',
    topTint: 'rgba(255, 94, 98, 0.10)',
    bottomTint: 'rgba(255, 45, 120, 0.30)',
    sun: 'vice',
    titleFill: '#ffffff',
    titleStroke: '#20063a',
    accent: '#ff2d78',
  },
  neon: {
    label: 'Neon Nights',
    hint: 'Cyan and magenta glow',
    photoFilter: 'saturate(1.5) contrast(1.15) brightness(0.92)',
    topTint: 'rgba(0, 229, 255, 0.10)',
    bottomTint: 'rgba(255, 0, 128, 0.32)',
    sun: 'ring',
    titleFill: '#ffffff',
    titleStroke: '#0b1030',
    accent: '#00e5ff',
  },
  gold: {
    label: 'Golden Hour',
    hint: 'Warm amber light',
    photoFilter: 'sepia(0.28) saturate(1.5) contrast(1.05)',
    topTint: 'rgba(255, 176, 0, 0.10)',
    bottomTint: 'rgba(255, 110, 0, 0.28)',
    sun: 'gold',
    titleFill: '#fff8e7',
    titleStroke: '#3a1c00',
    accent: '#ffb000',
  },
  noir: {
    label: 'Noir',
    hint: 'Black and white',
    photoFilter: 'grayscale(1) contrast(1.25) brightness(0.95)',
    topTint: 'rgba(255, 255, 255, 0.05)',
    bottomTint: 'rgba(0, 0, 0, 0.38)',
    sun: 'none',
    titleFill: '#ffffff',
    titleStroke: '#000000',
    accent: '#ffffff',
  },
};

// Sample photos shipped with the app. They were made with an image model for
// this project and are free to use; a person's own photos are read locally
// and never uploaded.
export const SAMPLES = {
  pier: { label: 'Pier', src: 'samples/pier.jpg' },
  boulevard: { label: 'Boulevard', src: 'samples/boulevard.jpg' },
  'neon-street': { label: 'Neon Street', src: 'samples/neon-street.jpg' },
};

export const SAMPLE_KEYS = Object.keys(SAMPLES);

export function defaultPanel(photo) {
  return { photo, zoom: 1, ox: 0, oy: 0 };
}

export function defaultState() {
  return {
    size: '1920x1080',
    layout: 'duo',
    grade: 'vice',
    title: 'Sunset Heist',
    subtitle: 'Sunset Coast · Summer',
    titleSize: 1,
    titlePos: 'bottom',
    tilt: -2,
    outline: true,
    panels: [
      defaultPanel('pier'),
      defaultPanel('boulevard'),
      defaultPanel('neon-street'),
    ],
    selected: 0,
  };
}

// Fit the panel list to a layout: keep the panels that still exist, fill new
// ones with the sample photos in turn.
export function fitPanelsToLayout(state) {
  const count = LAYOUTS[state.layout].panels.length;
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
