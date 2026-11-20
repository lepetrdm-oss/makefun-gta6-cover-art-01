// Sunset Cover Studio — data and state.
// Samples carry a focal point (where the subject's face is, as fractions of
// the photo) and a sky point (open sky, where sun / ring decorations may sit).
// Both are fixed metadata for the bundled photos, so renders are repeatable.

'use strict';

const ROLE_DEFAULTS = [
  'THE DRIVER', 'THE BOSS', 'THE BRAINS', 'THE GETAWAY',
  'THE LOOKOUT', 'THE ESCAPE', 'THE FIXER', 'THE CAPTAIN',
];

const NAME_DEFAULTS = [
  'MARISOL VEGA', 'ELIAS CROWE', 'JUNO PARK', 'RAY DELGADO',
  'NINA SORREL', 'TOMAS REY', 'ADA KANE', 'HUGO FERRER',
];

const QUOTE_DEFAULTS = [
  { q: 'PURE GOLDEN-HOUR MAYHEM', p: 'THE HARBOR GAZETTE' },
  { q: 'A SUN-BLEACHED JOYRIDE', p: 'THE MANGROVE TIMES' },
  { q: 'THE HOTTEST RIDE OF THE YEAR', p: 'GOLDEN MILE GAZETTE' },
];

const SAMPLES = [
  { id: 'boulevard',   src: 'samples/boulevard.jpg',   label: 'Boulevard',   focal: { x: 0.52, y: 0.16 }, sky: { x: 0.24, y: 0.20 } },
  { id: 'convertible', src: 'samples/convertible.jpg', label: 'Convertible', focal: { x: 0.78, y: 0.50 }, sky: { x: 0.22, y: 0.16 } },
  { id: 'neon-street', src: 'samples/neon-street.jpg', label: 'Neon Street', focal: { x: 0.21, y: 0.33 }, sky: { x: 0.72, y: 0.16 } },
  { id: 'pier',        src: 'samples/pier.jpg',        label: 'Pier',        focal: { x: 0.50, y: 0.42 }, sky: { x: 0.50, y: 0.14 } },
  { id: 'lifeguard',   src: 'samples/lifeguard.jpg',   label: 'Lifeguard',   focal: { x: 0.52, y: 0.32 }, sky: { x: 0.16, y: 0.13 } },
];

function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) || SAMPLES[0];
}

// Layouts return panel rectangles as fractions of the photo region. Slanted
// panels also carry a clip polygon (fractions of the photo region).
const LAYOUTS = {
  one: {
    label: 'One photo',
    panels: () => [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  hero2: {
    label: 'Hero + two',
    panels: () => [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.58, y: 0, w: 0.42, h: 0.5 },
      { x: 0.58, y: 0.5, w: 0.42, h: 0.5 },
    ],
  },
  trio: {
    label: 'Three panels',
    panels: () => [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  slanted: {
    label: 'Slanted trio',
    panels: () => [
      { x: 0, y: 0, w: 0.38, h: 1, poly: [[0, 0], [0.38, 0], [0.30, 1], [0, 1]] },
      { x: 0.30, y: 0, w: 0.40, h: 1, poly: [[0.38, 0], [0.70, 0], [0.62, 1], [0.30, 1]] },
      { x: 0.62, y: 0, w: 0.38, h: 1, poly: [[0.70, 0], [1, 0], [1, 1], [0.62, 1]] },
    ],
  },
  grid: {
    label: 'Four-panel grid',
    panels: () => [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  collage: {
    label: 'Hero collage',
    panels: () => [
      { x: 0, y: 0, w: 0.45, h: 1 },
      { x: 0.45, y: 0, w: 0.275, h: 0.34 },
      { x: 0.725, y: 0, w: 0.275, h: 0.34 },
      { x: 0.45, y: 0.34, w: 0.275, h: 0.34 },
      { x: 0.725, y: 0.34, w: 0.275, h: 0.34 },
      { x: 0.45, y: 0.68, w: 0.55, h: 0.32 },
    ],
  },
  splash: {
    label: 'Splash',
    panels: () => [
      { x: 0, y: 0, w: 0.60, h: 1, poly: [[0, 0], [0.60, 0], [0.46, 1], [0, 1]] },
      { x: 0.553, y: 0, w: 0.447, h: 1 / 3, poly: [[0.60, 0], [1, 0], [1, 1 / 3], [0.553, 1 / 3]] },
      { x: 0.507, y: 1 / 3, w: 0.493, h: 1 / 3, poly: [[0.553, 1 / 3], [1, 1 / 3], [1, 2 / 3], [0.507, 2 / 3]] },
      { x: 0.46, y: 2 / 3, w: 0.54, h: 1 / 3, poly: [[0.507, 2 / 3], [1, 2 / 3], [1, 1], [0.46, 1]] },
    ],
  },
};

// Grades: a multi-stop wash laid over every panel, a vignette strength, an
// accent colour for title / tags / chrome, and a decoration kind.
const GRADES = {
  vice: {
    label: 'Vice Sunset',
    wash: [[0, 'rgba(255,94,98,0.20)'], [0.5, 'rgba(255,140,66,0.10)'], [1, 'rgba(64,32,120,0.30)']],
    vignette: 0.36, accent: '#ffd166', decor: 'sun', filter: 'saturate(1.12) contrast(1.05)',
  },
  neon: {
    label: 'Neon Nights',
    wash: [[0, 'rgba(0,229,255,0.15)'], [0.5, 'rgba(255,0,128,0.10)'], [1, 'rgba(10,0,40,0.40)']],
    vignette: 0.46, accent: '#ff2e88', decor: 'rings', filter: 'saturate(1.25) contrast(1.08)',
  },
  golden: {
    label: 'Golden Hour',
    wash: [[0, 'rgba(255,183,77,0.22)'], [0.5, 'rgba(255,120,60,0.08)'], [1, 'rgba(60,20,60,0.28)']],
    vignette: 0.33, accent: '#ffe29a', decor: 'sun', filter: 'saturate(1.10) contrast(1.04)',
  },
  noir: {
    label: 'Noir',
    wash: [[0, 'rgba(0,0,0,0.06)'], [0.5, 'rgba(0,0,0,0.20)'], [1, 'rgba(0,0,0,0.52)']],
    vignette: 0.56, accent: '#e8e8e8', decor: 'none', filter: 'saturate(0.22) contrast(1.16)',
  },
  heat: {
    label: 'Heatwave',
    wash: [[0, 'rgba(255,0,110,0.20)'], [0.5, 'rgba(255,90,0,0.14)'], [1, 'rgba(30,0,50,0.44)']],
    vignette: 0.50, accent: '#ffb347', decor: 'sun', filter: 'saturate(1.30) contrast(1.10)',
  },
};

// Frame styles for the poster chrome. 'sunset' overlays the photo; the
// 'premiere' style reserves deep black bands with thin gold rules and the
// photo lives between them, like a gala premiere one-sheet.
const FRAME_STYLES = {
  sunset: { label: 'Sunset' },
  premiere: { label: 'Premiere' },
};

const LOOKS = {
  keyart: {
    label: 'Key Art',
    layout: 'collage', grade: 'vice', size: [1920, 1080],
    title: 'Sunset Heist', subtitle: 'Ocean Avenue · Summer',
    frameStyle: 'sunset', printTexture: true,
    panels: ['boulevard', 'convertible', 'neon-street', 'pier', 'neon-street', 'boulevard'],
  },
  neonportrait: {
    label: 'Neon Portrait',
    layout: 'slanted', grade: 'neon', size: [1080, 1350],
    title: 'Neon Coast', subtitle: 'After Midnight',
    frameStyle: 'sunset', printTexture: true,
    panels: ['boulevard', 'neon-street', 'lifeguard'],
  },
  goldengrid: {
    label: 'Golden Grid',
    layout: 'grid', grade: 'golden', size: [1080, 1080],
    title: 'Pier Pressure', subtitle: 'Retired · Mostly',
    frameStyle: 'sunset', printTexture: true,
    panels: ['boulevard', 'convertible', 'pier', 'lifeguard'],
  },
};

function blankPanel(i) {
  return {
    sample: SAMPLES[i % SAMPLES.length].id,
    upload: null,            // upload id when the panel shows an uploaded photo
    pan: { x: 0, y: 0 },     // -1..1, drag offset on top of the auto framing
    zoom: 1,                 // 1..2.5
    name: NAME_DEFAULTS[i % NAME_DEFAULTS.length],
    tag: ROLE_DEFAULTS[i % ROLE_DEFAULTS.length],
  };
}

function defaultState() {
  const st = {
    layout: 'collage',
    grade: 'vice',
    size: [1920, 1080],
    title: 'Sunset Heist',
    subtitle: 'Ocean Avenue · Summer',
    quotes: QUOTE_DEFAULTS.map((q) => ({ q: q.q, p: q.p })),
    billing: 'A SUNSET PICTURES PRODUCTION · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND',
    tagsOn: true,
    frameOn: true,
    frameStyle: 'sunset',
    printTexture: true,
    autoFrame: true,
    selected: 0,
    panels: [],
    uploads: {},             // id -> { src, focal, w, h }
  };
  for (let i = 0; i < 8; i++) st.panels.push(blankPanel(i));
  applyLook(st, 'keyart');
  return st;
}

function applyLook(st, name) {
  const look = LOOKS[name];
  if (!look) return;
  st.layout = look.layout;
  st.grade = look.grade;
  st.size = look.size.slice();
  st.title = look.title;
  st.subtitle = look.subtitle;
  st.frameOn = true;
  st.tagsOn = true;
  st.frameStyle = look.frameStyle;
  st.printTexture = look.printTexture;
  look.panels.forEach((sampleId, i) => {
    st.panels[i].sample = sampleId;
    st.panels[i].upload = null;
    st.panels[i].pan = { x: 0, y: 0 };
    st.panels[i].zoom = 1;
    st.panels[i].name = NAME_DEFAULTS[i % NAME_DEFAULTS.length];
    st.panels[i].tag = ROLE_DEFAULTS[i % ROLE_DEFAULTS.length];
  });
  st.selected = 0;
}

function panelCount(st) {
  return LAYOUTS[st.layout].panels().length;
}
