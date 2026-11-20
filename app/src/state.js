// Sunset Cover Studio — shared state, samples, layouts and Looks.
// Plain data plus small helpers only: rendering lives in cover.js and
// DOM wiring lives in main.js. Nothing here touches the network.

export const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'convertible', label: 'Convertible', src: 'samples/convertible.jpg' },
  { id: 'neon-street', label: 'Neon Street', src: 'samples/neon-street.jpg' },
  { id: 'lifeguard', label: 'Lifeguard', src: 'samples/lifeguard.jpg' },
  { id: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
];

export const SIZES = {
  '1080x1080': { label: 'Square - 1080 x 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait - 1080 x 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide - 1920 x 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  one: { label: 'One photo', panels: 1 },
  hero: { label: 'Hero + two', panels: 3 },
  trio: { label: 'Three panels', panels: 3 },
  slanted: { label: 'Slanted trio', panels: 3 },
  grid: { label: 'Four-panel grid', panels: 4 },
};

export const GRADES = {
  vice: { label: 'Vice Sunset' },
  neon: { label: 'Neon Nights' },
  golden: { label: 'Golden Hour' },
  noir: { label: 'Noir' },
};

export function makePanel(sample) {
  return { sample: sample, upload: null, panX: 0, panY: 0, zoom: 1 };
}

export const state = {
  layout: 'slanted',
  grade: 'vice',
  size: '1920x1080',
  title: 'Sunset Heist',
  subtitle: 'Sunset Coast · Summer',
  titleSize: 0.115,
  titleY: 0.78,
  titleTilt: -2,
  activePanel: 0,
  // Where the grade's sky ornament (striped sun / neon rings) sits:
  // a panel index plus a position inside that panel's box. Looks aim
  // it at open sky, never over a face.
  sky: { panel: 2, fx: 0.45, fy: 0.26 },
  panels: [makePanel('boulevard'), makePanel('convertible'), makePanel('neon-street')],
};

// One-click Looks: a whole composition in a single press. Key Art is
// the studio's default look, so the editor opens on it.
const LOOKS = {
  key: {
    layout: 'slanted', grade: 'vice', size: '1920x1080',
    title: 'Sunset Heist', subtitle: 'Sunset Coast · Summer',
    panels: ['boulevard', 'convertible', 'neon-street'],
    sky: { panel: 2, fx: 0.45, fy: 0.26 },
  },
  neon: {
    layout: 'trio', grade: 'neon', size: '1080x1350',
    title: 'Neon Nights', subtitle: 'Leonida After Dark',
    panels: ['boulevard', 'neon-street', 'lifeguard'],
    sky: { panel: 1, fx: 0.5, fy: 0.24 },
  },
  golden: {
    layout: 'grid', grade: 'golden', size: '1080x1080',
    title: 'Golden Hour', subtitle: 'Sunset Coast · Summer',
    panels: ['boulevard', 'convertible', 'lifeguard', 'pier'],
    sky: { panel: 1, fx: 0.36, fy: 0.28 },
  },
};

export function applyLook(name) {
  const look = LOOKS[name];
  if (!look) return;
  state.layout = look.layout;
  state.grade = look.grade;
  state.size = look.size;
  state.title = look.title;
  state.subtitle = look.subtitle;
  state.titleSize = 0.115;
  state.titleY = 0.78;
  state.titleTilt = -2;
  state.sky = { panel: look.sky.panel, fx: look.sky.fx, fy: look.sky.fy };
  state.panels = look.panels.map(makePanel);
  state.activePanel = 0;
}

export function setLayout(name) {
  if (!LAYOUTS[name]) return;
  state.layout = name;
  const want = LAYOUTS[name].panels;
  const fill = ['boulevard', 'convertible', 'neon-street', 'lifeguard'];
  while (state.panels.length < want) {
    state.panels.push(makePanel(fill[state.panels.length % fill.length]));
  }
  state.panels.length = want;
  if (state.activePanel >= want) state.activePanel = 0;
}

export function panelCount() {
  return LAYOUTS[state.layout].panels;
}
