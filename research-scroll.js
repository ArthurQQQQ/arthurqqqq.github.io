import { gsap, ScrollTrigger } from './vendor/gsap-scrolltrigger-3.15.1.js';

gsap.registerPlugin(ScrollTrigger);

const research = document.getElementById('research');
const phaseNames = ['one', 'two', 'three'];
const stories = [...research.querySelectorAll('.publication-list > li')].map(row => ({
  row,
  article: row.querySelector('.publication'),
  figure: row.querySelector('.paper-media'),
  image: row.querySelector('.paper-figure'),
  labels: [...row.querySelectorAll('.paper-phases li')],
  svg: null,
  stage: -1,
  progress: -1,
}));

const clamp = gsap.utils.clamp(0, 1);
const round = gsap.utils.snap(0.0001);

function blendAt(progress, center) {
  const t = clamp((progress - (center - 0.065)) / 0.13);
  return t * t * (3 - 2 * t);
}

function paintStory(story, progress, imageLoaded = false) {
  if (story.progress === progress && !imageLoaded) return;

  story.progress = progress;
  const stage = Math.min(2, Math.floor(progress * 3));
  const stepChanged = story.stage !== stage;
  if (stepChanged) {
    story.labels[story.stage]?.removeAttribute('aria-current');
    story.labels[stage].setAttribute('aria-current', 'step');
    story.stage = stage;
    story.figure.dataset.step = String(stage + 1);
  }

  const revealMiddle = blendAt(progress, 1 / 3);
  const revealEnd = blendAt(progress, 2 / 3);
  const weights = [1 - revealMiddle, revealMiddle - revealEnd, revealEnd];
  story.figure.style.setProperty('--scroll-accent', round(progress));
  story.figure.style.setProperty('--blend-middle', round(revealMiddle));
  story.figure.style.setProperty('--blend-end', round(revealEnd));

  if (!story.svg) return;
  if (stepChanged || imageLoaded) {
    story.svg.setAttribute('data-scroll-driven', '');
    story.svg.setAttribute('data-active-step', String(stage + 1));
  }
  story.svg.style.setProperty('--scroll-accent', round(progress));
  phaseNames.forEach((name, index) => {
    story.svg.style.setProperty('--weight-' + name, round(weights[index]));
    story.svg.style.setProperty('--progress-' + name, round(clamp(progress * 3 - index)));
  });
}

function resetStory(story) {
  story.labels[story.stage]?.removeAttribute('aria-current');
  story.stage = -1;
  story.progress = -1;
  story.row.removeAttribute('data-pinned');
  story.figure.removeAttribute('data-step');
  story.figure.style.removeProperty('--scroll-accent');
  story.figure.style.removeProperty('--blend-middle');
  story.figure.style.removeProperty('--blend-end');

  if (!story.svg) return;
  story.svg.removeAttribute('data-scroll-driven');
  story.svg.setAttribute('data-active-step', '1');
  story.svg.style.removeProperty('--scroll-accent');
  for (const name of phaseNames) {
    story.svg.style.removeProperty('--weight-' + name);
    story.svg.style.removeProperty('--progress-' + name);
  }
}

function attachImage(story) {
  const svg = story.image.contentDocument?.documentElement;
  if (svg?.localName !== 'svg') return;

  story.svg = svg;
  if (story.progress >= 0) paintStory(story, story.progress, true);
}

function updatePinning() {
  const viewport = window.innerHeight;
  const pinned = stories.map(story => viewport >= 560 && story.article.offsetHeight <= viewport - 125);
  stories.forEach((story, index) => story.row.toggleAttribute('data-pinned', pinned[index]));
}

function scrollBounds(story) {
  const viewport = window.innerHeight;
  if (!story.row.hasAttribute('data-pinned')) {
    const top = window.scrollY + story.image.getBoundingClientRect().top;
    return { start: top - viewport * 0.86, end: top - viewport * 0.21 };
  }

  const row = story.row.getBoundingClientRect();
  const stickyTop = Number.parseFloat(getComputedStyle(story.article).top);
  const pinnedStart = window.scrollY + row.top - stickyTop;
  const run = row.height - story.article.getBoundingClientRect().height;
  const lead = Math.min(86, viewport * 0.13);
  return { start: pinnedStart - lead, end: pinnedStart + Math.max(1, run) };
}

for (const story of stories) {
  story.image.addEventListener('load', () => attachImage(story));
  attachImage(story);
}

gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  research.setAttribute('data-scroll-motion', '');
  updatePinning();

  for (const story of stories) {
    const playhead = { progress: 0 };
    paintStory(story, 0);
    const animation = gsap.to(playhead, {
      progress: 1,
      duration: 1,
      ease: 'none',
      paused: true,
      onUpdate: () => paintStory(story, playhead.progress),
    });
    ScrollTrigger.create({
      trigger: story.row,
      start: () => scrollBounds(story).start,
      end: () => scrollBounds(story).end,
      animation,
      scrub: true,
    });
  }

  let refreshFrame = 0;
  function scheduleRefresh() {
    if (refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      updatePinning();
      ScrollTrigger.refresh();
    });
  }

  const resizeObserver = new ResizeObserver(scheduleRefresh);
  for (const story of stories) resizeObserver.observe(story.article);
  window.addEventListener('resize', scheduleRefresh, { passive: true });

  return () => {
    cancelAnimationFrame(refreshFrame);
    resizeObserver.disconnect();
    window.removeEventListener('resize', scheduleRefresh);
    research.removeAttribute('data-scroll-motion');
    stories.forEach(resetStory);
  };
});
