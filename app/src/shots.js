// Sunset Cover Studio — screenshot hooks.
// ?shot=cover        Key Art poster only (feed image)
// ?shot=cover-neon   Neon Portrait poster only
// ?shot=cover-golden Golden Grid poster only
// ?shot=editor       editor with Neon Portrait loaded
// Each mode sets window.__shotReady once the scene is fully rendered.

'use strict';

(function () {
  const mode = new URLSearchParams(location.search).get('shot');
  if (!mode) return;
  const studio = window.__studio;
  if (!studio) return;

  if (mode === 'cover') {
    document.body.classList.add('shot');
    studio.applyLook('keyart');
  } else if (mode === 'cover-neon') {
    document.body.classList.add('shot');
    studio.applyLook('neonportrait');
  } else if (mode === 'cover-golden') {
    document.body.classList.add('shot');
    studio.applyLook('goldengrid');
  } else if (mode === 'editor') {
    studio.applyLook('neonportrait');
    studio.state.selected = 1;
    studio.render();
  } else {
    return;
  }

  let tries = 0;
  const tick = () => {
    tries++;
    if (studio.allSamplesLoaded() || tries > 200) {
      const done = () => {
        studio.render();
        requestAnimationFrame(() => { window.__shotReady = true; });
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(done);
      else done();
    } else {
      setTimeout(tick, 50);
    }
  };
  tick();
})();
