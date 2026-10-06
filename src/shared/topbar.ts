const root = document.documentElement;
let previous = Math.max(0, scrollY);
let travel = 0;
let frame = 0;

function reveal() {
  root.removeAttribute('data-topbar-hidden');
  previous = Math.max(0, scrollY);
  travel = 0;
}

function update() {
  frame = 0;
  // Clamp overscroll so bouncing at either end cannot reverse the direction.
  const limit = Math.max(0, (document.scrollingElement?.scrollHeight ?? 0) - innerHeight);
  const position = Math.min(limit, Math.max(0, scrollY));
  const delta = position - previous;
  previous = position;
  if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
  travel += delta;
  const bar = document.querySelector<HTMLElement>('.site-topbar');
  if (!bar) return reveal();
  const engaged = bar.querySelector('[aria-expanded="true"], :focus-visible');
  if (position <= bar.offsetHeight || engaged) return reveal();
  if (Math.abs(travel) >= 8) {
    root.toggleAttribute('data-topbar-hidden', travel > 0);
    travel = 0;
  }
}

addEventListener('scroll', () => {
  if (!frame) frame = requestAnimationFrame(update);
}, { passive: true });
document.addEventListener('focusin', event => {
  if (event.target instanceof Element && event.target.closest('.site-topbar')) reveal();
});
addEventListener('samey-pageleave', reveal);
addEventListener('samey-pageload', reveal);
addEventListener('pageshow', reveal);
