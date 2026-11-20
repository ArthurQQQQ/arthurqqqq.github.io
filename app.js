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
