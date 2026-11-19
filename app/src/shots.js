// Sunset Cover Studio — shots.js
// Deterministic screenshot hooks. The page reads ?shot=cover|editor plus
// optional params (preset, layout, grade, size, title, subtitle, photos,
// titlepos, tilt) so a headless browser can reproduce an exact scene:
//   ?shot=cover&preset=keyart
//   ?shot=editor&preset=neonportrait
// main.js applies the params before its first render and sets
// window.__shotReady once the scene is fully painted.

const StudioShots = (() => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('shot') || '';

  function applyTo(state) {
    if (!mode) return state;
    const preset = params.get('preset');
    if (preset && StudioData.looks[preset]) StudioState.applyLook(state, preset);
    const layout = params.get('layout');
    if (layout && StudioData.layouts[layout]) state.layout = layout;
    const grade = params.get('grade');
    if (grade && StudioData.grades[grade]) state.grade = grade;
    const size = params.get('size');
    if (size && StudioData.sizes[size]) state.size = size;
    if (params.get('title') !== null) state.title = params.get('title');
    if (params.get('subtitle') !== null) state.subtitle = params.get('subtitle');
    if (params.get('titlepos') !== null) state.titlePos = params.get('titlepos');
    if (params.get('tilt') !== null) state.tilt = Number(params.get('tilt')) || 0;
    const photos = params.get('photos');
    if (photos) {
      photos.split(',').forEach((id, i) => {
        if (state.panels[i] && StudioData.samples.some((s) => s.id === id)) {
          state.panels[i] = StudioState.freshPanel(id);
        }
      });
    }
    return state;
  }

  return { mode, applyTo };
})();

window.StudioShots = StudioShots;
