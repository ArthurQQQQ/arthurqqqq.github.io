import { gsap, ScrollTrigger } from './vendor/gsap-scrolltrigger-3.15.1.js';

gsap.registerPlugin(ScrollTrigger);

const main = document.getElementById('main');
const siteHeader = document.querySelector('.site-header');
const siteFooter = document.querySelector('.site-footer');
const boardLight = document.querySelector('.pegboard-light');
const scholarPreview = document.getElementById('scholar-preview');
const scholarLink = scholarPreview.querySelector('.profile-link');
const research = document.getElementById('research');
const researchHeading = research.querySelector('.rail-heading');
const projects = document.getElementById('projects');
const projectsHeading = projects.querySelector('.rail-heading');
const workflows = [...projects.querySelectorAll('.projects-list > li')].map(row => ({
  row,
  article: row.querySelector('.workflow-card'),
}));
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

  const lightShift = gsap.to(boardLight, { y: -72, ease: 'none', paused: true });
  ScrollTrigger.create({
    start: 0,
    end: () => window.innerHeight * 1.1,
    animation: lightShift,
    scrub: true,
  });

  const revealTargets = main.querySelectorAll('.profile-preview, .paper-copy');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < .1) continue;
      entry.target.classList.add('scroll-reveal');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -9% 0px', threshold: .1 });
  for (const target of revealTargets) revealObserver.observe(target);

  let scholarTop = 0;
  let paperTop = 0;
  let projectTop = 0;
  let paperTravel = 0;
  let scholarTravel = 0;
  let projectTravel = 0;

  function setRailStop(row, article, fits) {
    row.toggleAttribute('data-rail-stop', fits);
    if (!fits) article.removeAttribute('data-rail-engaged');
  }

  function updateRailStops() {
    const viewport = window.innerHeight;
    const headingTop = siteHeader.offsetHeight + 8;
    scholarTop = Math.max(headingTop + 4, Math.round(Math.min(108, Math.max(72, viewport * .12))));
    paperTop = headingTop + researchHeading.offsetHeight + 12;
    projectTop = headingTop + projectsHeading.offsetHeight + 12;
    paperTravel = Math.round(Math.min(220, Math.max(144, viewport * .24)));
    scholarTravel = Math.round(Math.min(136, Math.max(96, viewport * .16)));
    projectTravel = Math.round(Math.min(136, Math.max(96, viewport * .15)));
    main.style.setProperty('--section-heading-top', headingTop + 'px');
    scholarPreview.style.setProperty('--rail-dock-top', scholarTop + 'px');
    research.style.setProperty('--rail-dock-top', paperTop + 'px');
    projects.style.setProperty('--rail-dock-top', projectTop + 'px');
    research.style.setProperty('--rail-dock-travel', paperTravel + 'px');
    scholarPreview.style.setProperty('--rail-dock-travel', scholarTravel + 'px');
    projects.style.setProperty('--rail-dock-travel', projectTravel + 'px');

    setRailStop(scholarPreview, scholarLink, scholarLink.offsetHeight <= viewport - scholarTop - 24);
    for (const story of stories) {
      setRailStop(story.row, story.article, viewport >= 560 && story.article.offsetHeight <= viewport - paperTop - 24);
    }
    for (const workflow of workflows) {
      setRailStop(workflow.row, workflow.article, viewport >= 560 && workflow.article.offsetHeight <= viewport - projectTop - 24);
    }

    const lastWorkflow = workflows[workflows.length - 1];
    const clearance = lastWorkflow.row.hasAttribute('data-rail-stop')
      ? Math.max(0, viewport - projectTop - lastWorkflow.article.offsetHeight - siteFooter.offsetHeight)
      : 0;
    projects.style.setProperty('--project-end-clearance', clearance + 'px');
  }

  function dockStart(row, top) {
    return window.scrollY + row.getBoundingClientRect().top - top;
  }

  function scrollBounds(story) {
    if (story.row.hasAttribute('data-rail-stop')) {
      const start = dockStart(story.row, paperTop);
      return { start, end: start + paperTravel };
    }

    const top = window.scrollY + story.figure.getBoundingClientRect().top;
    const viewport = window.innerHeight;
    return { start: top - viewport * .86, end: top - viewport * .21 };
  }

  updateRailStops();
  ScrollTrigger.addEventListener('refreshInit', updateRailStops);

  function registerGuide(row, article, dockTop, travel) {
    function updateGuide({ isActive }) {
      article.toggleAttribute('data-rail-engaged', isActive === true && row.hasAttribute('data-rail-stop'));
    }
    ScrollTrigger.create({
      trigger: row,
      start: () => dockStart(row, dockTop()),
      end: () => dockStart(row, dockTop()) + travel(),
      onToggle: updateGuide,
      onRefresh: updateGuide,
    });
  }

  registerGuide(scholarPreview, scholarLink, () => scholarTop, () => scholarTravel);

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

  for (const workflow of workflows) {
    registerGuide(workflow.row, workflow.article, () => projectTop, () => projectTravel);
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
  resizeObserver.observe(siteHeader);
  resizeObserver.observe(siteFooter);
  resizeObserver.observe(researchHeading);
  resizeObserver.observe(projectsHeading);
  resizeObserver.observe(scholarLink);
  for (const story of stories) resizeObserver.observe(story.article);
  for (const workflow of workflows) resizeObserver.observe(workflow.article);
  window.addEventListener('resize', scheduleRefresh, { passive: true });

  return () => {
    cancelAnimationFrame(refreshFrame);
    revealObserver.disconnect();
    for (const target of revealTargets) target.classList.remove('scroll-reveal');
    resizeObserver.disconnect();
    window.removeEventListener('resize', scheduleRefresh);
    ScrollTrigger.removeEventListener('refreshInit', updateRailStops);
    research.removeAttribute('data-scroll-motion');
    main.style.removeProperty('--section-heading-top');
    for (const section of [scholarPreview, research, projects]) {
      section.style.removeProperty('--rail-dock-top');
      section.style.removeProperty('--rail-dock-travel');
    }
    projects.style.removeProperty('--project-end-clearance');
    setRailStop(scholarPreview, scholarLink, false);
    for (const workflow of workflows) setRailStop(workflow.row, workflow.article, false);
    stories.forEach(resetStory);
  };
});
