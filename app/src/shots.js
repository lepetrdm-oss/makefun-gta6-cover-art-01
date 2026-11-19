// Sunset Cover Studio — deterministic screenshot scenes. With ?shot=cover or
// ?shot=editor in the URL the editor applies the scene named by the query
// (a Look preset, plus optional layout/grade/size/title/subtitle/photos
// overrides), waits for the photos and fonts, renders, and only then sets
// window.__shotReady — so a headless browser can screenshot the exact same
// pixels every time. shots.json at the repository root lists the scenes.

export function initShots(app) {
  const params = new URLSearchParams(location.search);
  const mode = params.get('shot');
  if (mode !== 'cover' && mode !== 'editor') return;
  document.body.classList.add(mode === 'cover' ? 'shot-cover' : 'shot-editor');

  const state = app.state;
  if (params.get('preset')) app.applyLookById(params.get('preset'));
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('size')) state.size = params.get('size');
  if (params.get('title') !== null) state.title = params.get('title');
  if (params.get('subtitle') !== null) state.subtitle = params.get('subtitle');
  if (params.get('photos')) {
    params
      .get('photos')
      .split(',')
      .forEach((id, i) => {
        if (state.panels[i] && id) state.panels[i].photo = id.trim();
      });
  }
  if (mode === 'cover') app.setFullPreview(true);
  app.refresh();
  app.whenReady().then(() => {
    app.refresh();
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
