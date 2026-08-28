const rings = document.querySelector('#rings');
for (let i = 0; i < 15; i += 1) {
  const ring = document.createElement('span');
  ring.className = 'ring';
  ring.style.setProperty('--r', `${i * 10 - 34}deg`);
  ring.style.setProperty('--s', `${0.42 + i * 0.043}`);
  ring.style.setProperty('--d', `${i * -0.37}s`);
  rings.appendChild(ring);
}

const dimensions = [
  ['言语流畅度', '停顿、语速、回答启动时间与自我修正，组成一段表达的呼吸感。', 'AUDIO / RHYTHM'],
  ['找词与词汇', '留意具体名称是否自然出现，以及“那个东西”式的绕述是否反复出现。', 'TRANSCRIPT + AUDIO'],
  ['叙事与逻辑', '一件事的先后顺序、相关性与信息量，是否仍然清楚。', 'TRANSCRIPT / CONTEXT'],
  ['重复表达', '只观察同一次通话里可被直接听见的重复，不把它延伸成疾病判断。', 'SINGLE SESSION ONLY'],
  ['近期事件', '最近发生的生活细节，能否围绕问题被连续讲述。', 'RECENT MEMORY / STORY'],
];
const count = document.querySelector('#stageCount');
const label = document.querySelector('#stageLabel');
const copy = document.querySelector('#stageCopy');
const source = document.querySelector('#stageSource');
document.querySelectorAll('.feature-item').forEach((item) => {
  item.addEventListener('click', () => {
    const index = Number(item.dataset.index);
    document.querySelector('.feature-item.active')?.classList.remove('active');
    item.classList.add('active');
    count.textContent = `0${index + 1} / 05`;
    label.textContent = dimensions[index][0];
    copy.textContent = dimensions[index][1];
    source.textContent = dimensions[index][2];
  });
});

// Editorial scroll reveal: transform + opacity only, with a 56ms stagger.
const revealTargets = document.querySelectorAll('.feature-stage, .feature-item, .step');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const siblings = [...entry.target.parentElement.children];
    entry.target.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(entry.target), 6) * 56}ms`);
    entry.target.classList.add('is-in');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.18, rootMargin: '0px 0px -10% 0px' });
revealTargets.forEach((target) => revealObserver.observe(target));
