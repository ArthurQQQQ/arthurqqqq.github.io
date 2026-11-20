'use strict';

for (const diagram of document.querySelectorAll('[data-paper-diagram]')) {
  const figure = diagram.querySelector('object');
  const controls = diagram.querySelector('.diagram-steps');
  const caption = diagram.querySelector('.diagram-caption');
  const buttons = [...controls.querySelectorAll('button[data-step]')];

  function updateFigure() {
    const svg = figure.contentDocument?.documentElement;
    if (svg?.localName === 'svg') {
      svg.setAttribute('data-active-step', diagram.dataset.activeStep);
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      diagram.dataset.activeStep = button.dataset.step;
      for (const peer of buttons) {
        peer.setAttribute('aria-pressed', String(peer === button));
      }
      caption.textContent = button.dataset.description;
      updateFigure();
    });
  }

  figure.addEventListener('load', updateFigure);
  updateFigure();
  controls.hidden = false;
}

const previewDialog = document.getElementById('profile-preview-dialog');

if (typeof previewDialog?.showModal === 'function') {
  const title = document.getElementById('preview-title');
  const image = document.getElementById('preview-image');
  const original = document.getElementById('preview-original');
  const zoom = document.getElementById('preview-zoom');
  const media = previewDialog.querySelector('.preview-dialog-media');
  let opener = null;

  function setActualSize(enabled) {
    zoom.setAttribute('aria-pressed', String(enabled));
    media.classList.toggle('is-actual-size', enabled);
    media.tabIndex = enabled ? 0 : -1;
    media.scrollTop = 0;
    media.scrollLeft = 0;
  }

  for (const button of document.querySelectorAll('[data-preview-open]')) {
    const card = button.closest('.profile-card');
    const link = card.querySelector('.profile-link');
    const thumbnail = card.querySelector('.profile-preview img');

    button.addEventListener('click', () => {
      opener = button;
      title.textContent = card.querySelector('h2').textContent + ' preview';
      image.alt = thumbnail.alt;
      image.src = thumbnail.currentSrc || thumbnail.src;
      original.href = link.href;
      setActualSize(false);
      previewDialog.showModal();
    });

    button.closest('.profile-tools').hidden = false;
  }

  zoom.addEventListener('click', () => setActualSize(zoom.getAttribute('aria-pressed') !== 'true'));
  original.addEventListener('click', () => previewDialog.close());
  previewDialog.addEventListener('close', () => {
    opener?.focus({ preventScroll: true });
    opener = null;
  });
}
