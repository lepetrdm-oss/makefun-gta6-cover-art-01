// Fixed scenes for screenshots: ?shot=editor shows the studio with a sample
// photo loaded; ?shot=cover shows the cover alone, edge to edge.
// Query knobs: preset (a one-click look, applied first), photo (a sample
// key, or "all" to cycle the samples across the panels), photos (a comma
// list of sample keys, one per panel), caption (the title), subtitle,
// layout, size, grade, titlepos.
// window.__shotReady is set once the first cover has painted.

import {
  GRADES, LAYOUTS, SAMPLE_KEYS, SIZES,
  applyPreset, defaultPanel, layoutPanelCount,
} from './state.js';

export function shotMode() {
  return new URLSearchParams(location.search).get('shot');
}

export function applyShotParams(state, query) {
  const preset = query.get('preset');
  if (preset) applyPreset(state, preset);

  const photo = query.get('photo');
  const photos = query.get('photos');
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

  const count = layoutPanelCount(state.layout);
  if (photos) {
    const keys = photos.split(',').map((k) => k.trim()).filter((k) => SAMPLE_KEYS.includes(k));
    if (keys.length) {
      state.panels = Array.from(
        { length: count },
        (_, i) => defaultPanel(keys[i % keys.length]),
      );
    }
  } else if (photo === 'all') {
    state.panels = Array.from(
      { length: count },
      (_, i) => defaultPanel(SAMPLE_KEYS[i % SAMPLE_KEYS.length]),
    );
  } else if (photo && SAMPLE_KEYS.includes(photo)) {
    state.panels = Array.from({ length: count }, () => defaultPanel(photo));
  }
  if (state.panels.length !== count) {
    state.panels = Array.from(
      { length: count },
      (_, i) => state.panels[i] || defaultPanel(SAMPLE_KEYS[i % SAMPLE_KEYS.length]),
    );
  }
  state.selected = 0;
}

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
