// Hero listening ritual: a phone line becomes a living record of many calls.
const listenHero = document.querySelector('.hero-listen');
const phoneTrigger = document.getElementById('phoneTrigger');
const startListenPrompt = document.getElementById('startListenPrompt');
const skipListen = document.getElementById('skipListen');
const soundToggle = document.getElementById('soundToggle');
const startListeningButton = document.getElementById('startListeningButton');
const ringLines = document.getElementById('ringLines');
const connectionLine = document.querySelector('.connection-line');
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const compactMotion = window.matchMedia?.('(max-width: 800px)');
let listenTimer;
let soundEnabled = false;
let drawingAnimations = [];
let cycleRun = 0;
const RING_START_ANGLE = 2.42;

const ringPoint = (radius, ringIndex, angle) => {
  const phase = ringIndex * 0.73;
  const ageWave = Math.sin(angle * 3 + phase) * radius * 0.022;
  const voiceWave = Math.sin(angle * (7 + ringIndex % 3) - phase) * (0.9 + ringIndex % 3 * 0.45);
  const fineGrain = Math.sin(angle * 17 + ringIndex * 1.7) * 0.7;
  const localStress = Math.max(0, Math.sin(angle * 2 - 1.25)) * Math.sin(angle * 19) * (ringIndex % 2) * .7;
  const unevenRadius = radius + ageWave + voiceWave + fineGrain + localStress;
  return [
    300 + Math.cos(angle) * unevenRadius,
    300 + Math.sin(angle) * unevenRadius * 0.965,
  ];
};

const segmentPath = (radius, ringIndex, start, end) => {
  const span = end - start;
  const steps = Math.max(72, Math.ceil(span * 24));
  const startPoint = ringPoint(radius, ringIndex, start);
  const isFullTurn = Math.abs(span - Math.PI * 2) < 1e-8;
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    if (index === 0) return startPoint;
    if (index === steps) {
      // A complete turn must terminate at the exact same numeric point as it started.
      return isFullTurn ? startPoint : ringPoint(radius, ringIndex, end);
    }
    const angle = start + (span * index) / steps;
    return ringPoint(radius, ringIndex, angle);
  });
  // The terminal point is explicitly part of the polyline; no `Z` closure is used.
  return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
};

const buildLivingRings = () => {
  if (!ringLines || ringLines.childElementCount) return;
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const labelRings = new Set([3, 7, 11, 14]);

  for (let ringIndex = 0; ringIndex < 18; ringIndex += 1) {
    const radius = 258 - ringIndex * 13.2;
    const segmentCount = 1;
    const gapSize = 0;
    const rotation = RING_START_ANGLE;
    const usableArc = (Math.PI * 2 - gapSize * segmentCount) / segmentCount;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const isBark = ringIndex === 0;
      const start = rotation + segmentIndex * (usableArc + gapSize);
      const segmentFill = 1;
      const end = start + usableArc * segmentFill;
      const path = document.createElementNS(svgNamespace, 'path');
      path.setAttribute('d', segmentPath(radius, ringIndex, start, end));
      path.setAttribute('class', `ring-segment${isBark ? ' bark-segment' : ''}`);
      path.dataset.ring = String(ringIndex);
      path.style.setProperty('--ring-opacity', String(isBark ? 0.9 : 0.3 + ringIndex * 0.028));
      path.style.setProperty('--ring-width', `${isBark ? 9.2 : 0.9 + ((ringIndex + segmentIndex) % 4) * 0.34}px`);
      if (labelRings.has(ringIndex) && segmentIndex === 0) {
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', document.querySelector(`.call-labels [data-ring="${ringIndex}"]`)?.textContent || '通话记录');
      }
      ringLines.appendChild(path);
      const pathLength = path.getTotalLength();
      path.dataset.pathLength = String(pathLength);
      path.style.strokeDasharray = `${pathLength} ${pathLength}`;
      path.style.strokeDashoffset = String(pathLength);
      path.style.visibility = 'hidden';
    }
  }

  ringLines.querySelectorAll('.ring-segment').forEach((path) => {
    const label = document.querySelector(`.call-labels [data-ring="${path.dataset.ring}"]`);
    if (!label) return;
    const showLabel = () => label.classList.add('is-hovered');
    const hideLabel = () => label.classList.remove('is-hovered');
    path.addEventListener('pointerenter', showLabel);
    path.addEventListener('pointerleave', hideLabel);
    path.addEventListener('focus', showLabel);
    path.addEventListener('blur', hideLabel);
  });
};

const prepareConnectionLine = () => {
  if (!connectionLine) return;
  const length = connectionLine.getTotalLength();
  connectionLine.dataset.pathLength = String(length);
  connectionLine.style.strokeDasharray = `${length} ${length}`;
  connectionLine.style.strokeDashoffset = String(length);
  connectionLine.style.visibility = 'hidden';
};

const resetDrawingState = () => {
  drawingAnimations.forEach((animation) => animation.cancel());
  drawingAnimations = [];
  [connectionLine, ...ringLines.querySelectorAll('.ring-segment')].filter(Boolean).forEach((path) => {
    const length = Number(path.dataset.pathLength);
    path.getAnimations().forEach((animation) => animation.cancel());
    path.style.removeProperty('animation');
    path.style.removeProperty('opacity');
    path.style.strokeDasharray = `${length} ${length}`;
    path.style.strokeDashoffset = String(length);
    path.style.visibility = 'hidden';
  });
};

const waitForCycle = (duration, token) => new Promise((resolve) => {
  window.setTimeout(() => resolve(token === cycleRun), duration);
});

const animateDashPath = (path, from, to, duration, token, { hideOnFinish = false } = {}) => new Promise((resolve) => {
  if (!path || token !== cycleRun) {
    resolve(false);
    return;
  }
  const length = Number(path.dataset.pathLength);
  path.style.strokeDasharray = `${length} ${length}`;
  path.style.strokeDashoffset = String(from);
  path.style.visibility = 'visible';
  const animation = path.animate(
    [{ strokeDashoffset: from }, { strokeDashoffset: to }],
    {
      duration,
      easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
      fill: 'both',
    },
  );
  drawingAnimations.push(animation);
  const cleanup = (completed) => {
    drawingAnimations = drawingAnimations.filter((candidate) => candidate !== animation);
    if (completed && token === cycleRun) {
      path.style.strokeDashoffset = String(to);
      if (to === 0) path.style.strokeDasharray = 'none';
      if (hideOnFinish && to > 0) path.style.visibility = 'hidden';
    }
    resolve(completed && token === cycleRun);
  };
  animation.onfinish = () => cleanup(true);
  animation.oncancel = () => cleanup(false);
});

const animatePathOpacity = (path, from, to, duration, token) => new Promise((resolve) => {
  if (!path || token !== cycleRun) {
    resolve(false);
    return;
  }
  path.style.opacity = String(from);
  const animation = path.animate(
    [{ opacity: from }, { opacity: to }],
    {
      duration,
      easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
      fill: 'both',
    },
  );
  drawingAnimations.push(animation);
  const cleanup = (completed) => {
    drawingAnimations = drawingAnimations.filter((candidate) => candidate !== animation);
    if (completed && token === cycleRun) path.style.opacity = String(to);
    resolve(completed && token === cycleRun);
  };
  animation.onfinish = () => cleanup(true);
  animation.oncancel = () => cleanup(false);
});

const playInnerRingPulse = async (rings, token) => {
  const innerRings = rings.slice(1).reverse();
  const timeScale = compactMotion?.matches ? 0.82 : 1;
  if (!await waitForCycle(1200 * timeScale, token)) return;

  // Keep the bark fixed. One inner record slowly recedes and returns before
  // the next one moves, so the tree stays present instead of restarting.
  while (token === cycleRun) {
    for (const ring of innerRings) {
      const length = Number(ring.dataset.pathLength);
      if (!await animateDashPath(ring, 0, length, 1450 * timeScale, token)) return;
      if (!await waitForCycle(320 * timeScale, token)) return;
      if (!await animateDashPath(ring, length, 0, 1650 * timeScale, token)) return;
      if (!await waitForCycle(620 * timeScale, token)) return;
    }
  }
};

const playRingSequence = async (token) => {
  resetDrawingState();
  const timeScale = compactMotion?.matches ? 0.62 : 1;
  const rings = [...ringLines.querySelectorAll('.ring-segment')];
  if (!rings.length || token !== cycleRun) return;

  // Let the end of the phone line and the beginning of the bark overlap in
  // time. Their endpoints already meet spatially, so the overlap reads as one
  // continuous line changing character instead of two animations switching.
  const connectionGrowth = animateDashPath(
    connectionLine,
    Number(connectionLine?.dataset.pathLength),
    0,
    1500 * timeScale,
    token,
  );
  if (!await waitForCycle(900 * timeScale, token)) return;
  const barkGrowth = animateDashPath(
    rings[0],
    Number(rings[0].dataset.pathLength),
    0,
    1800 * timeScale,
    token,
  );
  if (!await waitForCycle(420 * timeScale, token)) return;
  const connectionFade = animatePathOpacity(connectionLine, 0.78, 0.18, 950 * timeScale, token);
  const transitionFinished = await Promise.all([connectionGrowth, barkGrowth, connectionFade]);
  if (transitionFinished.some((finished) => !finished) || token !== cycleRun) return;

  // Continue from the same fixed start point, closing every ring before the
  // next inner record begins.
  for (let index = 1; index < rings.length; index += 1) {
    if (!await animateDashPath(rings[index], Number(rings[index].dataset.pathLength), 0, (285 + (index % 3) * 28) * timeScale, token)) return;
  }

  if (token !== cycleRun) return;
  listenHero.classList.remove('is-started', 'is-animating');
  listenHero.classList.add('is-complete');
  playInnerRingPulse(rings, token);
};

const showCompleteRings = async (token, { immediate = false } = {}) => {
  const activeAnimations = drawingAnimations.slice();
  drawingAnimations = [];
  const paths = [connectionLine, ...ringLines.querySelectorAll('.ring-segment')].filter(Boolean);
  const offsets = new Map(paths.map((path) => {
    const length = Number(path.dataset.pathLength);
    const computedOffset = Number.parseFloat(getComputedStyle(path).strokeDashoffset);
    return [path, Number.isFinite(computedOffset) ? Math.max(0, Math.min(length, computedOffset)) : length];
  }));

  activeAnimations.forEach((animation) => animation.cancel());

  const completions = paths.map((path) => {
    path.style.visibility = 'visible';
    const length = Number(path.dataset.pathLength);
    const currentOffset = offsets.get(path);

    if (immediate || currentOffset <= 0.01) {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      path.style.visibility = 'visible';
      return Promise.resolve(token === cycleRun);
    }

    return animateDashPath(path, currentOffset, 0, 520, token);
  });

  if (connectionLine) connectionLine.style.opacity = '0.18';
  return (await Promise.all(completions)).every(Boolean);
};

const playListeningTone = () => {
  if (!soundEnabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.012, context.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.72);
  gain.connect(context.destination);
  [350, 440].forEach((frequency) => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.75);
  });
  window.setTimeout(() => context.close(), 900);
};

const completeListening = async () => {
  if (!listenHero) return;
  cycleRun += 1;
  const token = cycleRun;
  window.clearTimeout(listenTimer);
  listenHero.classList.remove('is-animating');
  const rings = [...ringLines.querySelectorAll('.ring-segment')];
  const completed = await showCompleteRings(token, { immediate: Boolean(reducedMotion?.matches) });
  if (!completed || token !== cycleRun) return;
  listenHero.classList.remove('is-started');
  listenHero.classList.add('is-complete');
  if (!reducedMotion?.matches) playInnerRingPulse(rings, token);
};

const startListening = () => {
  if (!listenHero || listenHero.classList.contains('is-complete') || listenHero.classList.contains('is-animating')) return;
  cycleRun += 1;
  const token = cycleRun;
  listenHero.classList.add('is-started');
  listenHero.classList.add('is-animating');
  playListeningTone();
  if (reducedMotion?.matches) {
    completeListening();
    return;
  }
  playRingSequence(token);
};

buildLivingRings();
prepareConnectionLine();
phoneTrigger?.addEventListener('click', startListening);
startListenPrompt?.addEventListener('click', startListening);
skipListen?.addEventListener('click', completeListening);
startListeningButton?.addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('start')?.scrollIntoView({ behavior: reducedMotion?.matches ? 'auto' : 'smooth' });
});
soundToggle?.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.innerHTML = `${soundEnabled ? '声音开启' : '声音关闭'} <span>${soundEnabled ? '●' : '○'}</span>`;
});

let resizeFrame;
window.addEventListener('resize', () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    // SVG geometry scales with its viewBox. Completed and in-progress paths do
    // not need to be rebuilt on resize; resetting them caused stale states.
    if (!listenHero?.classList.contains('is-started') && !listenHero?.classList.contains('is-complete')) {
      resetDrawingState();
    }
  });
}, { passive: true });

window.addEventListener('pageshow', () => {
  if (listenHero && !listenHero.classList.contains('is-started') && !listenHero.classList.contains('is-complete')) {
    resetDrawingState();
  }
});

// Ease-out + blur-to-sharp staggered reveals, inspired by Emil Kowalski's motion guidance.
const motionTargets = document.querySelectorAll('.problem-grid article, .insight-main, .insight-side > div, .report-card, .step, .baseline-card');
const motionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const siblings = [...entry.target.parentElement.children];
    entry.target.style.transitionDelay = `${Math.max(0, siblings.indexOf(entry.target)) * 60}ms`;
    entry.target.classList.add('is-visible');
    motionObserver.unobserve(entry.target);
  });
}, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
motionTargets.forEach((target) => motionObserver.observe(target));
const dialogueSection = document.querySelector('.dialogue-section');
const dialogueObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) entry.target.classList.add('is-visible');
}, { threshold: 0.2 });
if (dialogueSection) dialogueObserver.observe(dialogueSection);

const quoteTrigger = document.getElementById('quoteTrigger');
quoteTrigger?.addEventListener('click', () => {
  document.getElementById('analysisStage')?.classList.toggle('active');
});
