// Sunset Cover Studio — state.js
// The app's data: sample photos, post sizes, panel layouts, colour grades,
// one-click Looks presets and the default editor state. Plain data and two
// small helpers; the render engine lives in cover.js, the UI in main.js.

const StudioData = {
  samples: [
    { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard' },
    { id: 'pier', src: 'samples/pier.jpg', label: 'Pier' },
    { id: 'neon-street', src: 'samples/neon-street.jpg', label: 'Neon street' },
    { id: 'convertible', src: 'samples/convertible.jpg', label: 'Convertible' },
    { id: 'lifeguard', src: 'samples/lifeguard.jpg', label: 'Lifeguard tower' },
  ],

  sizes: {
    '1920x1080': { label: '1920 × 1080', w: 1920, h: 1080 },
    '1080x1350': { label: '1080 × 1350', w: 1080, h: 1350 },
    '1080x1080': { label: '1080 × 1080', w: 1080, h: 1080 },
  },

  layouts: {
    one: { label: 'One photo', panels: 1 },
    hero: { label: 'Hero + two', panels: 3 },
    trio: { label: 'Three panels', panels: 3 },
    slant: { label: 'Slanted trio', panels: 3 },
    grid: { label: 'Four panels', panels: 4 },
  },

  grades: {
    vice: {
      label: 'Vice Sunset',
      wash: ['rgba(255, 93, 98, 0.30)', 'rgba(255, 166, 66, 0.12)', 'rgba(58, 10, 92, 0.34)'],
      sun: 'striped',
      sunTop: '#ffe259',
      sunBottom: '#ff7518',
      accent: '#ff2e88',
      titleFill: ['#fff7e6', '#ffb3c8'],
      edge: 'rgba(255, 240, 220, 0.85)',
      photoFilter: 'saturate(1.12) contrast(1.06)',
    },
    neon: {
      label: 'Neon Nights',
      wash: ['rgba(8, 10, 60, 0.34)', 'rgba(120, 0, 120, 0.16)', 'rgba(2, 6, 30, 0.42)'],
      sun: 'rings',
      sunTop: '#aefcff',
      sunBottom: '#ff2e88',
      accent: '#22e6ff',
      titleFill: ['#eaffff', '#7df9ff'],
      edge: 'rgba(140, 240, 255, 0.80)',
      photoFilter: 'saturate(1.18) contrast(1.10) brightness(0.98)',
    },
    gold: {
      label: 'Golden Hour',
      wash: ['rgba(255, 170, 40, 0.26)', 'rgba(255, 120, 60, 0.10)', 'rgba(70, 30, 10, 0.30)'],
      sun: 'striped',
      sunTop: '#fff3b0',
      sunBottom: '#ff9f1c',
      accent: '#ff9f1c',
      titleFill: ['#fffbe8', '#ffd166'],
      edge: 'rgba(255, 244, 200, 0.85)',
      photoFilter: 'saturate(1.08) contrast(1.04) brightness(1.03)',
    },
    noir: {
      label: 'Noir',
      wash: ['rgba(20, 20, 24, 0.30)', 'rgba(0, 0, 0, 0.12)', 'rgba(0, 0, 0, 0.44)'],
      sun: 'none',
      sunTop: '#ffffff',
      sunBottom: '#9a9a9a',
      accent: '#e8e8e8',
      titleFill: ['#ffffff', '#bdbdbd'],
      edge: 'rgba(240, 240, 240, 0.75)',
      photoFilter: 'grayscale(0.88) contrast(1.14)',
    },
  },

  looks: {
    keyart: {
      label: 'Key Art',
      layout: 'slant',
      grade: 'vice',
      size: '1920x1080',
      photos: ['boulevard', 'convertible', 'neon-street', 'pier'],
      title: 'Sunset Heist',
      subtitle: 'Sunset Coast · Summer',
      titlePos: 'bottom',
      tilt: -2,
    },
    neonportrait: {
      label: 'Neon Portrait',
      layout: 'trio',
      grade: 'neon',
      size: '1080x1350',
      photos: ['boulevard', 'neon-street', 'lifeguard', 'convertible'],
      title: 'Boulevard Queen',
      subtitle: 'Neon Nights · Leonida',
      titlePos: 'bottom',
      tilt: -2,
    },
    goldengrid: {
      label: 'Golden Grid',
      layout: 'grid',
      grade: 'gold',
      size: '1080x1080',
      photos: ['pier', 'convertible', 'boulevard', 'lifeguard'],
      title: 'Neon Nights',
      subtitle: 'Golden Hour · Vice Shores',
      titlePos: 'bottom',
      tilt: -2,
    },
  },
};

// One panel's crop state: which sample it shows (or a custom uploaded image
// held by main.js), how far it is zoomed, and its focal point in 0..1.
function freshPanel(sampleId) {
  return { sample: sampleId, custom: null, zoom: 1, ox: 0.5, oy: 0.5 };
}

// The editor state. The default is the Key Art look, so the first thing a
// visitor sees is the strongest composition the app makes.
function defaultState() {
  const state = {
    layout: 'slant',
    grade: 'vice',
    size: '1920x1080',
    title: 'Sunset Heist',
    subtitle: 'Sunset Coast · Summer',
    titleSize: 100,
    titlePos: 'bottom',
    tilt: -2,
    outline: true,
    selected: 0,
    panels: [],
  };
  applyLook(state, 'keyart');
  return state;
}

// Copy a Looks preset into the state, resetting every panel's crop.
function applyLook(state, lookId) {
  const look = StudioData.looks[lookId];
  if (!look) return state;
  state.layout = look.layout;
  state.grade = look.grade;
  state.size = look.size;
  state.title = look.title;
  state.subtitle = look.subtitle;
  state.titlePos = look.titlePos;
  state.tilt = look.tilt;
  state.selected = 0;
  state.panels = [0, 1, 2, 3].map((i) => freshPanel(look.photos[i % look.photos.length]));
  return state;
}

// How many panels the current layout draws.
function layoutPanelCount(state) {
  return StudioData.layouts[state.layout].panels;
}

window.StudioData = StudioData;
window.StudioState = { freshPanel, defaultState, applyLook, layoutPanelCount };
