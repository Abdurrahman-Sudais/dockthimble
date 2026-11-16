// DockThimble motion: trucks back into their bays along the door lanes, queue bars rise, and cards roll in
// like a dock door opening. Nothing moves when reduced motion is requested.
export function startMotion() {
  if (typeof window === 'undefined' || window.__dtMotion) return;
  window.__dtMotion = true;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof IntersectionObserver === 'undefined') return;
  document.documentElement.classList.add('dt-js');
  const els = [...document.querySelectorAll('[data-dock]')];
  const show = (el) => el.classList.add('in');
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px', threshold: 0.1});
  els.forEach((el, i) => { el.style.setProperty('--d', `${(i % 4) * 90}ms`); io.observe(el); });
  let t = 0;
  addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => els.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) show(el); }), 150); }, {passive: true});
}
