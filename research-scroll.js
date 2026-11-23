'use strict';

const research = document.getElementById('research');
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const stories = [...research.querySelectorAll('.publication-list > li')].map(row => ({
  row,
  article: row.querySelector('.publication'),
  figure: row.querySelector('.paper-media'),
  image: row.querySelector('.paper-figure'),
  phases: [...row.querySelectorAll('.paper-phases li')],
  svg: null,
  stage: 0,
  position: '',
  phaseProgress: '',
}));

let pendingFrame = 0;

function scrollPosition(story) {
  const viewport = window.innerHeight;
  if (story.row.hasAttribute('data-pinned')) {
    const bounds = story.row.getBoundingClientRect();
    const stickyTop = Number.parseFloat(getComputedStyle(story.article).top);
    const runway = Math.max(1, bounds.height - story.article.getBoundingClientRect().height);
    return (stickyTop - bounds.top) / runway;
  }

  // Short viewports keep the normal flow and advance as the image crosses the screen.
  const imageTop = story.image.getBoundingClientRect().top;
  return (viewport * 0.76 - imageTop) / (viewport * 0.55);
}

function updateFrame() {
  pendingFrame = 0;
  if (!motion.matches) return;

  // Read the sections before applying any changes to the page or SVG documents.
  const positions = stories.map(story => Math.min(1, Math.max(0, scrollPosition(story))));
  stories.forEach((story, index) => {
    const progress = positions[index];
    const stage = Math.min(story.phases.length, Math.floor(progress * story.phases.length) + 1);
    const position = progress.toFixed(4);

    if (position !== story.position || stage !== story.stage) {
      story.position = position;
      story.phaseProgress = (progress * story.phases.length - (stage - 1)).toFixed(4);
      story.figure.style.setProperty('--scroll-accent', position);
      story.svg?.style.setProperty('--scroll-accent', position);
      story.svg?.style.setProperty('--phase-progress', story.phaseProgress);
    }

    if (stage !== story.stage) {
      story.phases[story.stage - 1]?.removeAttribute('aria-current');
      story.phases[stage - 1].setAttribute('aria-current', 'step');
      story.stage = stage;
      story.figure.dataset.step = String(stage);
      story.svg?.setAttribute('data-active-step', String(stage));
    }
  });
}

function scheduleFrame() {
  if (motion.matches && !pendingFrame) pendingFrame = requestAnimationFrame(updateFrame);
}

function updateLayout() {
  const enabled = motion.matches;
  const viewport = window.innerHeight;
  const canPin = enabled && viewport >= 560;
  const pinned = stories.map(story => canPin && story.article.offsetHeight <= viewport - 125);
  research.toggleAttribute('data-scroll-motion', enabled);

  stories.forEach((story, index) => {
    story.row.toggleAttribute('data-pinned', pinned[index]);
    story.svg?.toggleAttribute('data-scroll-driven', enabled);
    if (enabled) return;

    story.phases[story.stage - 1]?.removeAttribute('aria-current');
    story.stage = 0;
    story.position = '';
    story.phaseProgress = '';
    story.figure.removeAttribute('data-step');
    story.figure.style.removeProperty('--scroll-accent');
    story.svg?.style.removeProperty('--scroll-accent');
    story.svg?.style.removeProperty('--phase-progress');
    story.svg?.setAttribute('data-active-step', '1');
  });
  scheduleFrame();
}

function attachImage(story) {
  const svg = story.image.contentDocument?.documentElement;
  if (svg?.localName !== 'svg') return;

  story.svg = svg;
  svg.toggleAttribute('data-scroll-driven', motion.matches);
  svg.setAttribute('data-active-step', String(story.stage || 1));
  if (story.position) {
    svg.style.setProperty('--scroll-accent', story.position);
    svg.style.setProperty('--phase-progress', story.phaseProgress);
  }
}

const resizeObserver = new ResizeObserver(updateLayout);
for (const story of stories) {
  story.image.addEventListener('load', () => attachImage(story));
  attachImage(story);
  resizeObserver.observe(story.article);
}
window.addEventListener('scroll', scheduleFrame, { passive: true });
window.addEventListener('resize', updateLayout, { passive: true });
motion.addEventListener('change', updateLayout);
updateLayout();
