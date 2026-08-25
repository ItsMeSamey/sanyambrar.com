(() => {
  const root = document.getElementById('cas-viz');
  if (root) {
    const pill = document.getElementById('atom-pill');
    const owners = document.getElementById('owners');
    const caption = document.getElementById('cas-caption');
    const a = [...root.querySelectorAll('[data-a]')];
    const b = [...root.querySelectorAll('[data-b]')];
    const captions = [
      'The lock starts unlocked. Thread A is about to acquire it.',
      'Thread A starts with expected = false.',
      'A compares false with false, stores true, and owns the lock.',
      'Thread A is in the critical section. The atomic remains true.',
      'Thread B expects false. Its CAS fails because the atomic is true. C++ overwrites expected with true.',
      'The loop reuses expected = true. CAS(true → true) succeeds even though A still owns the lock.',
      'Both A and B are now in the protected region. Mutual exclusion is gone.'
    ];
    let step = 0;
    const paint = () => {
      [...a, ...b].forEach(el => el.classList.remove('active'));
      a.forEach(el => { if (+el.dataset.a <= step) el.classList.add('active'); });
      b.forEach(el => { if (+el.dataset.b <= step) el.classList.add('active'); });
      const locked = step >= 2;
      pill.textContent = locked ? 'true' : 'false';
      pill.classList.toggle('locked', locked);
      const n = step >= 6 ? 2 : step >= 3 ? 1 : 0;
      owners.textContent = `owners: ${n}`;
      owners.classList.toggle('danger', n > 1);
      caption.textContent = captions[step];
    };
    document.getElementById('cas-step')?.addEventListener('click', () => { step = Math.min(6, step + 1); paint(); });
    document.getElementById('cas-reset')?.addEventListener('click', () => { step = 0; paint(); });
    paint();
  }

  const ordering = document.getElementById('ordering-viz');
  if (ordering) {
    const buttons = [...ordering.querySelectorAll('[data-order]')];
    const release = document.getElementById('release-op');
    const acquire = document.getElementById('acquire-op');
    const arrow = document.getElementById('hb-arrow');
    const caption = document.getElementById('ordering-caption');
    const setMode = mode => {
      buttons.forEach(b => b.classList.toggle('on', b.dataset.order === mode));
      const fixed = mode === 'fixed';
      release.innerHTML = fixed ? 'active = false<small>release</small>' : 'active = false<small>relaxed / no release edge</small>';
      acquire.innerHTML = fixed ? 'wait observes false<small>acquire</small>' : 'wait observes false<small>relaxed / no acquire edge</small>';
      arrow.textContent = fixed ? '→' : '×';
      arrow.className = `hb ${fixed ? 'good' : 'bad'}`;
      caption.textContent = fixed
        ? 'The release/acquire hand-off creates a happens-before edge. Shared work before release is ordered before shared access after acquire.'
        : 'The atomic value is coherent, but there is no happens-before edge carrying the runner\'s ordinary writes to the waiting thread.';
    };
    buttons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.order)));
    setMode('old');
  }
})();
