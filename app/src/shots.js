// Fixed scenes for screenshots: ?shot=editor shows the studio with a sample
// photo loaded; ?shot=cover shows the cover alone, edge to edge.
// Query knobs: photo (a sample key, or "all" to cycle the samples across the
// panels), caption (the title), subtitle, layout, size, grade, titlepos.
// window.__shotReady is set once the first cover has painted.

import { GRADES, LAYOUTS, SAMPLE_KEYS, SIZES, defaultPanel } from './state.js';

export function shotMode() {
  return new URLSearchParams(location.search).get('shot');
}

export function applyShotParams(state, query) {
  const photo = query.get('photo');
  const caption = query.get('caption');
  const subtitle = query.get('subtitle');
  const layout = query.get('layout');
  const size = query.get('size');
  const grade = query.get('grade');
  const titlepos = query.get('titlepos');

  if (layout && LAYOUTS[layout]) state.layout = layout;
  if (size && SIZES[size]) state.size = size;
  if (grade && GRADES[grade]) state.grade = grade;
  if (titlepos && ['top', 'middle', 'bottom'].includes(titlepos)) state.titlePos = titlepos;
  if (caption !== null) state.title = caption;
  if (subtitle !== null) state.subtitle = subtitle;

  if (photo === 'all') {
    state.panels = LAYOUTS[state.layout].panels.map(
      (_, i) => defaultPanel(SAMPLE_KEYS[i % SAMPLE_KEYS.length]),
    );
  } else if (photo && SAMPLE_KEYS.includes(photo)) {
    state.panels = LAYOUTS[state.layout].panels.map(() => defaultPanel(photo));
  }
  state.selected = 0;
}

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
