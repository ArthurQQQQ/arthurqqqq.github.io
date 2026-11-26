import { gsap, ScrollTrigger } from './vendor/gsap-scrolltrigger-3.15.1.js';

gsap.registerPlugin(ScrollTrigger);

const main = document.getElementById('main');
const scholarPreview = document.getElementById('scholar-preview');
const scholarLink = scholarPreview.querySelector('.profile-link');
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
  story.article.toggleAttribute('data-rail-engaged', story.row.hasAttribute('data-rail-stop') && progress > 0 && progress < 1);
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
  story.row.removeAttribute('data-rail-stop');
  story.article.removeAttribute('data-rail-engaged');
  story.figure.removeAttribute('data-step');
  story.figure.style.removeProperty('--scroll-accent');

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

for (const story of stories) {
  story.image.addEventListener('load', () => attachImage(story));
  attachImage(story);
}

gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  research.setAttribute('data-scroll-motion', '');

  let dockTop = 0;
  let paperTravel = 0;
  let scholarTravel = 0;

  function updateRailStops() {
    const viewport = window.innerHeight;
    dockTop = Math.round(Math.min(108, Math.max(72, viewport * .12)));
    paperTravel = Math.round(Math.min(220, Math.max(144, viewport * .24)));
    scholarTravel = Math.round(Math.min(136, Math.max(96, viewport * .16)));
    main.style.setProperty('--rail-dock-top', dockTop + 'px');
    research.style.setProperty('--rail-dock-travel', paperTravel + 'px');
    scholarPreview.style.setProperty('--rail-dock-travel', scholarTravel + 'px');

    const room = viewport - dockTop - 24;
    const scholarFits = scholarLink.offsetHeight <= room;
    scholarPreview.toggleAttribute('data-rail-stop', scholarFits);
    if (!scholarFits) scholarLink.removeAttribute('data-rail-engaged');
    for (const story of stories) {
      const fits = viewport >= 560 && story.article.offsetHeight <= room;
      story.row.toggleAttribute('data-rail-stop', fits);
      if (!fits) story.article.removeAttribute('data-rail-engaged');
    }
  }

  function dockStart(row) {
    return window.scrollY + row.getBoundingClientRect().top - dockTop;
  }

  function scrollBounds(story) {
    if (story.row.hasAttribute('data-rail-stop')) {
      const start = dockStart(story.row);
      return { start, end: start + paperTravel };
    }

    const top = window.scrollY + story.figure.getBoundingClientRect().top;
    const viewport = window.innerHeight;
    return { start: top - viewport * .86, end: top - viewport * .21 };
  }

  updateRailStops();
  ScrollTrigger.addEventListener('refreshInit', updateRailStops);

  function updateScholarGuide({ isActive }) {
    scholarLink.toggleAttribute('data-rail-engaged', isActive === true && scholarPreview.hasAttribute('data-rail-stop'));
  }

  ScrollTrigger.create({
    trigger: scholarPreview,
    start: () => dockStart(scholarPreview),
    end: () => dockStart(scholarPreview) + scholarTravel,
    onToggle: updateScholarGuide,
    onRefresh: updateScholarGuide,
  });

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
      ScrollTrigger.refresh();
    });
  }

  const resizeObserver = new ResizeObserver(scheduleRefresh);
  resizeObserver.observe(scholarLink);
  for (const story of stories) resizeObserver.observe(story.article);
  window.addEventListener('resize', scheduleRefresh, { passive: true });

  return () => {
    cancelAnimationFrame(refreshFrame);
    resizeObserver.disconnect();
    window.removeEventListener('resize', scheduleRefresh);
    ScrollTrigger.removeEventListener('refreshInit', updateRailStops);
    research.removeAttribute('data-scroll-motion');
    main.style.removeProperty('--rail-dock-top');
    scholarPreview.style.removeProperty('--rail-dock-travel');
    research.style.removeProperty('--rail-dock-travel');
    scholarPreview.removeAttribute('data-rail-stop');
    scholarLink.removeAttribute('data-rail-engaged');
    stories.forEach(resetStory);
  };
});
