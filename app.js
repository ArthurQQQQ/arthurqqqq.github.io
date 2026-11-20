(() => {
  'use strict';

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  const demo = document.querySelector('[data-retrieval-demo]');
  if (demo) {
    const buttons = Array.from(demo.querySelectorAll('[data-retrieval-state]'));
    const description = demo.querySelector('[data-retrieval-description]');
    const descriptions = {
      single: 'A single pass finds the first clue but misses the bridge.',
      repair: 'A bounded extra pass follows the bridge to the supporting source.'
    };

    for (const button of buttons) {
      button.addEventListener('click', () => {
        const state = button.dataset.retrievalState;
        if (!Object.prototype.hasOwnProperty.call(descriptions, state) || demo.dataset.state === state) return;
        demo.classList.remove('is-transitioning');
        demo.dataset.state = state;
        for (const peer of buttons) {
          peer.setAttribute('aria-pressed', String(peer.dataset.retrievalState === state));
        }
        if (description) description.textContent = descriptions[state];
        if (state === 'repair' && !motionPreference.matches) {
          window.requestAnimationFrame(() => {
            if (demo.dataset.state === 'repair') demo.classList.add('is-transitioning');
          });
        }
      });
    }
    demo.addEventListener('animationend', event => {
      if (event.animationName === 'evidence-travel') demo.classList.remove('is-transitioning');
    });
  }
})();
