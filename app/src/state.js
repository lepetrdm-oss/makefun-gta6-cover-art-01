// Sunset Cover Studio — the shared state the editor and the render engine
// agree on: sample photos, panel layouts, colour grades, post sizes and the
// one-click Looks. The preview, the PNG export and the deterministic
// screenshot scenes all draw from exactly this state, so what you see in the
// editor is what the export writes.

export const SAMPLE_PHOTOS = [
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', src: 'samples/pier.jpg', label: 'Pier' },
  { id: 'neon-street', src: 'samples/neon-street.jpg', label: 'Neon street' },
  { id: 'convertible', src: 'samples/convertible.jpg', label: 'Convertible' },
  { id: 'lifeguard', src: 'samples/lifeguard.jpg', label: 'Lifeguard tower' },
];

export const LAYOUTS = [
  { id: 'one', name: 'One photo', panels: 1 },
  { id: 'hero', name: 'Hero + two', panels: 3 },
  { id: 'trio', name: 'Three panels', panels: 3 },
  { id: 'slant', name: 'Slanted trio', panels: 3 },
  { id: 'grid', name: 'Four panels', panels: 4 },
];

export const SIZES = [
  { id: 'wide', name: '1920 × 1080', w: 1920, h: 1080 },
  { id: 'portrait', name: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'square', name: '1080 × 1080', w: 1080, h: 1080 },
];

// A grade is a multi-stop colour wash laid over the panels, a treatment for
// the sky (a striped retro sun disc, glowing neon rings, or none), the title
// colours and how hard the vignette bites at the corners.
export const GRADES = {
  vice: {
    name: 'Vice Sunset',
    wash: [
      [0, 'rgba(255, 106, 61, 0.20)'],
      [0.42, 'rgba(255, 47, 150, 0.14)'],
      [0.78, 'rgba(94, 32, 140, 0.16)'],
      [1, 'rgba(24, 10, 66, 0.34)'],
    ],
    sun: 'disc',
    sunStops: ['#ffe259', '#ffa751', '#ff2e96'],
    titleTop: '#ffffff',
    titleBottom: '#ffd9ec',
    accent: '#ff2e96',
    edge: 'rgba(255, 240, 214, 0.9)',
    vignette: 0.34,
  },
  neon: {
    name: 'Neon Nights',
    wash: [
      [0, 'rgba(14, 116, 144, 0.20)'],
      [0.5, 'rgba(88, 28, 135, 0.18)'],
      [1, 'rgba(2, 6, 23, 0.42)'],
    ],
    sun: 'rings',
    sunStops: ['#67e8f9', '#22d3ee', '#e879f9'],
    titleTop: '#ffffff',
    titleBottom: '#a5f3fc',
    accent: '#22d3ee',
    edge: 'rgba(165, 243, 252, 0.9)',
    vignette: 0.42,
  },
  golden: {
    name: 'Golden Hour',
    wash: [
      [0, 'rgba(255, 183, 3, 0.18)'],
      [0.55, 'rgba(251, 113, 133, 0.12)'],
      [1, 'rgba(88, 28, 28, 0.30)'],
    ],
    sun: 'disc',
    sunStops: ['#fff3b0', '#ffb703', '#fb7185'],
    titleTop: '#ffffff',
    titleBottom: '#ffedb0',
    accent: '#ffb703',
    edge: 'rgba(255, 243, 176, 0.9)',
    vignette: 0.3,
  },
  noir: {
    name: 'Noir',
    wash: [
      [0, 'rgba(148, 163, 184, 0.14)'],
      [0.6, 'rgba(30, 41, 59, 0.20)'],
      [1, 'rgba(0, 0, 0, 0.46)'],
    ],
    sun: 'none',
    sunStops: ['#e2e8f0', '#94a3b8', '#475569'],
    titleTop: '#ffffff',
    titleBottom: '#cbd5e1',
    accent: '#e2e8f0',
    edge: 'rgba(226, 232, 240, 0.85)',
    vignette: 0.52,
  },
};

// One-click Looks: a whole composition — layout, grade, post size, caption
// and a photo in every panel — applied in a single click.
export const LOOKS = [
  {
    id: 'keyart',
    name: 'Key Art',
    layout: 'slant',
    grade: 'vice',
    size: 'wide',
    title: 'Sunset Heist',
    subtitle: 'Sunset Coast · Summer',
    photos: ['boulevard', 'convertible', 'neon-street'],
  },
  {
    id: 'neonportrait',
    name: 'Neon Portrait',
    layout: 'trio',
    grade: 'neon',
    size: 'portrait',
    title: 'Boulevard Queen',
    subtitle: 'Neon Nights',
    photos: ['boulevard', 'neon-street', 'lifeguard'],
  },
  {
    id: 'goldengrid',
    name: 'Golden Grid',
    layout: 'grid',
    grade: 'golden',
    size: 'square',
    title: 'Neon Nights',
    subtitle: 'Golden Hour',
    photos: ['convertible', 'neon-street', 'pier', 'lifeguard'],
  },
];

export function panelCount(layoutId) {
  const layout = LAYOUTS.find((l) => l.id === layoutId);
  return layout ? layout.panels : 1;
}

export function sizeOf(sizeId) {
  return SIZES.find((s) => s.id === sizeId) || SIZES[0];
}

function blankPanel(photo) {
  return { photo, zoom: 1, ox: 0, oy: 0 };
}

// The editor state. Panels always holds four entries; a layout simply uses
// the first panelCount() of them. ox/oy pan the photo inside its panel in
// units of the panel's overflow, zoom multiplies the cover-fit scale.
export function createState() {
  const state = {
    layout: 'slant',
    grade: 'vice',
    size: 'wide',
    title: '',
    subtitle: '',
    titleScale: 1,
    titlePos: 'bottom',
    tilt: -1.5,
    outline: true,
    panels: [blankPanel('boulevard'), blankPanel('pier'), blankPanel('neon-street'), blankPanel('lifeguard')],
    selected: 0,
  };
  applyLook(state, LOOKS[0]);
  return state;
}

export function applyLook(state, look) {
  state.layout = look.layout;
  state.grade = look.grade;
  state.size = look.size;
  state.title = look.title;
  state.subtitle = look.subtitle;
  state.panels = state.panels.map((panel, i) => blankPanel(look.photos[i % look.photos.length]));
  state.selected = 0;
  return state;
}

// A tiny seeded PRNG (mulberry32). The film grain and halftone in the render
// engine are seeded with a fixed seed, so an export is byte-stable: the same
// state always draws the same cover, with no Math.random anywhere.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
