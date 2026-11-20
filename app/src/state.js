// Sunset Cover Studio — shared state, data tables and the seeded PRNG.
// No DOM access here: the editor (main.js) and the renderer (cover.js)
// both build on these tables.

// Deterministic PRNG (mulberry32). Render paths must never call
// Math.random: the same cover inputs must always draw the same pixels.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
  { id: 'neon-street', label: 'Neon Street', src: 'samples/neon-street.jpg' },
  { id: 'convertible', label: 'Convertible', src: 'samples/convertible.jpg' },
  { id: 'lifeguard', label: 'Lifeguard', src: 'samples/lifeguard.jpg' },
];

export const LAYOUTS = [
  { id: 'one', label: 'One photo', panels: 1 },
  { id: 'hero', label: 'Hero + two', panels: 3 },
  { id: 'trio', label: 'Three panels', panels: 3 },
  { id: 'slanted', label: 'Slanted trio', panels: 3 },
  { id: 'grid', label: 'Four-panel grid', panels: 4 },
];

// Each grade is a multi-stop colour wash (top -> bottom) plus a flat tint
// and a vignette. `decoration` names the motif drawn over the sky of the
// preset's decoration panel: a striped retro sun or glowing neon rings.
export const GRADES = [
  { id: 'vice', label: 'Vice Sunset', decoration: 'sun', accent: '#ff2e88',
    stops: [[0, 'rgba(255,46,136,0.32)'], [0.45, 'rgba(255,110,64,0.20)'], [1, 'rgba(38,16,84,0.36)']],
    tint: 'rgba(255,84,60,0.10)', vignette: 0.42, grayscale: 0 },
  { id: 'neon', label: 'Neon Nights', decoration: 'rings', accent: '#00e5ff',
    stops: [[0, 'rgba(0,229,255,0.24)'], [0.5, 'rgba(255,0,128,0.18)'], [1, 'rgba(6,0,54,0.44)']],
    tint: 'rgba(64,0,255,0.10)', vignette: 0.5, grayscale: 0 },
  { id: 'golden', label: 'Golden Hour', decoration: 'sun', accent: '#ffb300',
    stops: [[0, 'rgba(255,179,0,0.28)'], [0.5, 'rgba(255,110,64,0.16)'], [1, 'rgba(74,32,8,0.32)']],
    tint: 'rgba(255,160,40,0.10)', vignette: 0.38, grayscale: 0 },
  { id: 'noir', label: 'Noir', decoration: 'none', accent: '#f5f5f5',
    stops: [[0, 'rgba(20,20,28,0.28)'], [0.55, 'rgba(0,0,0,0.10)'], [1, 'rgba(0,0,0,0.50)']],
    tint: 'rgba(30,30,40,0.14)', vignette: 0.62, grayscale: 0.85 },
];

export const COVER_SIZES = [
  { id: '1920x1080', label: '1920 × 1080 — landscape', w: 1920, h: 1080 },
  { id: '1080x1350', label: '1080 × 1350 — portrait', w: 1080, h: 1350 },
  { id: '1080x1080', label: '1080 × 1080 — square', w: 1080, h: 1080 },
];

// One-click Looks. `decoPanel` is the panel whose open sky carries the
// grade's decoration — always a street or car panel, never a portrait,
// so the sun / rings can never land on a face.
export const LOOKS = [
  { id: 'keyart', label: 'Key Art', layout: 'slanted', grade: 'vice',
    panels: ['boulevard', 'convertible', 'neon-street'],
    title: 'Sunset Heist', subtitle: 'Sunset Coast · Summer', size: '1920x1080',
    decoPanel: 2 },
  { id: 'neonportrait', label: 'Neon Portrait', layout: 'trio', grade: 'neon',
    panels: ['boulevard', 'neon-street', 'lifeguard'],
    title: 'Neon Nights', subtitle: 'Vice City After Dark', size: '1080x1350',
    decoPanel: 1 },
  { id: 'goldengrid', label: 'Golden Grid', layout: 'grid', grade: 'golden',
    panels: ['boulevard', 'convertible', 'neon-street', 'pier'],
    title: 'Golden Hour', subtitle: 'Four Sides of Summer', size: '1080x1080',
    decoPanel: 1 },
];

export function makePanel(sampleId) {
  return { sample: sampleId || 'boulevard', upload: null, zoom: 1, panX: 0.5, panY: 0.5 };
}

export function defaultState() {
  const look = LOOKS[0];
  return {
    layout: look.layout,
    grade: look.grade,
    title: look.title,
    subtitle: look.subtitle,
    size: look.size,
    decoPanel: look.decoPanel,
    panels: look.panels.map((id) => makePanel(id)),
    selected: 0,
  };
}

export function layoutById(id) { return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0]; }
export function gradeById(id) { return GRADES.find((g) => g.id === id) || GRADES[0]; }
export function sizeById(id) { return COVER_SIZES.find((s) => s.id === id) || COVER_SIZES[0]; }
export function sampleById(id) { return SAMPLES.find((s) => s.id === id) || SAMPLES[0]; }
export function lookById(id) { return LOOKS.find((l) => l.id === id) || LOOKS[0]; }
