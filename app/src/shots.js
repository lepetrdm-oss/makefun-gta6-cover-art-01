// Sunset Cover Studio — screenshot hooks.
// ?shot=cover   renders just the cover, filling the viewport.
// ?shot=editor  renders the full editor with a Look loaded.
// Optional params: ?look=<look id> and ?size=<cover size id>.
// When the requested scene is fully rendered (photos decoded, fonts
// loaded), window.__shotReady is set so the screenshot driver can fire.
export function setupShots(api) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot !== 'cover' && shot !== 'editor') return;

  if (shot === 'cover') api.markCoverMode();
  else api.markEditorMode();

  const look = params.get('look');
  if (look) api.applyLook(look);
  const size = params.get('size');
  if (size) api.setSize(size);

  api.whenReady().then(() => {
    window.__shotReady = true;
  });
}
