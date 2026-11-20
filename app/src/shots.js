// Sunset Cover Studio — screenshot scenes used by shots.json.
// ?shot=cover fills the viewport with the finished cover for the
// chosen Look; ?shot=editor shows the full editor with that Look
// loaded. When the scene is painted, window.__shotReady flips true
// so the screenshot driver knows it can capture.

export async function initShots(opts) {
  const params = new URLSearchParams(location.search);
  const look = params.get('look') || 'key';
  opts.applyLook(look);
  if (params.get('shot') === 'cover') {
    document.body.classList.add('cover-shot');
  }
  opts.syncUI();
  await opts.refresh();
  window.__shotReady = true;
}
