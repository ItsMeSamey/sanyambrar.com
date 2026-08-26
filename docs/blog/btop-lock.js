(() => {
  const root = document.getElementById('cas-viz');
  if (root) {
    const $ = (id) => document.getElementById(id);
    const pill = $('atom-pill');
    const owners = $('owners');
    const ownerSlots = [...$('owner-slots').children];
    const caption = $('cas-caption');
    const eventBox = $('cas-event');
    const eventText = $('cas-event-text');
    const aCard = $('thread-a-card');
    const bCard = $('thread-b-card');
    const aState = $('a-state');
    const bState = $('b-state');
    const aExpected = $('a-expected');
    const bExpected = $('b-expected');
    const aInstruction = $('a-instruction');
    const bInstruction = $('b-instruction');
    const count = $('cas-count');
    const play = $('cas-play');
    const codeLine = $('cas-code-line');
    const jumps = [...root.querySelectorAll('[data-cas-jump]')];

    const states = [
      {
        atom: false, owners: [], aState: 'waiting', bState: 'waiting',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'about to acquire', bInstruction: 'not contending yet',
        tag: 'state', kind: '', event: 'The atomic is false. Nobody owns the critical section.',
        caption: 'No contention yet.'
      },
      {
        atom: false, owners: [], aState: 'running', bState: 'waiting',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'expected = false', bInstruction: 'not contending yet',
        tag: 'A', kind: '', event: 'Thread A prepares the expected value required for an unlocked lock.',
        caption: 'A wants to change false → true.'
      },
      {
        atom: true, owners: ['A'], aState: 'owner', bState: 'waiting',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'CAS(false → true) → success', bInstruction: 'not contending yet',
        tag: 'A', kind: '', event: 'The comparison matches. A stores true and now owns the critical section.',
        caption: 'So far, the lock behaves correctly.'
      },
      {
        atom: true, owners: ['A'], aState: 'inside', bState: 'running',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'inside critical section', bInstruction: 'expected = false',
        tag: 'B', kind: '', event: 'Thread B arrives while A still owns the lock.',
        caption: 'This is the contention case the loop has to handle.'
      },
      {
        atom: true, owners: ['A'], aState: 'inside', bState: 'retry',
        aExpected: 'false', bExpected: 'true',
        aInstruction: 'inside critical section', bInstruction: 'CAS(false → true) → fail',
        tag: 'CAS fail', kind: 'fail', event: 'B observes true. The CAS fails and C++ overwrites B\'s expected argument with the observed value: true.',
        caption: 'The failure mutates expected. The loop does not reset it.'
      },
      {
        atom: true, owners: ['A'], aState: 'inside', bState: 'owner?',
        aExpected: 'false', bExpected: 'true',
        aInstruction: 'inside critical section', bInstruction: 'CAS(true → true) → success',
        tag: 'CAS success', kind: 'breach', event: 'The next comparison is true == true. The desired value is also true, so the CAS succeeds without changing the atomic.',
        caption: 'The API reports success even though A never released the lock.'
      },
      {
        atom: true, owners: ['A', 'B'], aState: 'inside', bState: 'inside',
        aExpected: 'false', bExpected: 'true',
        aInstruction: 'inside critical section', bInstruction: 'inside critical section',
        tag: 'broken', kind: 'breach', event: 'Both threads are now inside code that was written under the assumption of mutual exclusion.',
        caption: 'The boolean still says “locked”, but there are two owners.'
      }
    ];

    let step = 0;
    let timer = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      play.textContent = 'Play';
    };
    addEventListener('samey-pageleave', stop, { once: true });

    const paint = () => {
      const s = states[step];
      pill.textContent = String(s.atom);
      pill.classList.toggle('locked', s.atom);
      owners.textContent = `${s.owners.length} owner${s.owners.length === 1 ? '' : 's'}`;
      owners.classList.toggle('danger', s.owners.length > 1);

      ownerSlots.forEach((slot, i) => {
        const name = i === 0 ? 'A' : 'B';
        const on = s.owners.includes(name);
        slot.classList.toggle('on', on);
        slot.classList.toggle('bad', on && s.owners.length > 1);
      });

      aState.textContent = s.aState;
      bState.textContent = s.bState;
      aExpected.textContent = s.aExpected;
      bExpected.textContent = s.bExpected;
      aInstruction.textContent = s.aInstruction;
      bInstruction.textContent = s.bInstruction;

      aCard.classList.toggle('active', step >= 1);
      bCard.classList.toggle('active', step >= 3);
      aCard.classList.toggle('owns', s.owners.includes('A') && s.owners.length === 1);
      bCard.classList.toggle('breach', s.owners.includes('B'));
      aCard.classList.toggle('breach', s.owners.length > 1);

      eventBox.className = `cas-event ${s.kind}`;
      eventBox.querySelector('.event-tag').textContent = s.tag;
      eventText.textContent = s.event;
      caption.textContent = s.caption;
      count.textContent = `${step} / 6`;
      codeLine.classList.toggle('hotline', step >= 2 && step <= 5);

      jumps.forEach((button, i) => {
        button.classList.toggle('done', i < step);
        button.classList.toggle('current', i === step);
        button.setAttribute('aria-current', i === step ? 'step' : 'false');
      });
    };

    const go = (next) => {
      step = Math.max(0, Math.min(states.length - 1, next));
      paint();
      if (step === states.length - 1) stop();
    };

    $('cas-step')?.addEventListener('click', () => go(step + 1));
    $('cas-prev')?.addEventListener('click', () => go(step - 1));
    $('cas-reset')?.addEventListener('click', () => { stop(); go(0); });
    play?.addEventListener('click', () => {
      if (timer) return stop();
      if (step === states.length - 1) step = 0;
      play.textContent = 'Pause';
      paint();
      timer = setInterval(() => go(step + 1), 1050);
    });
    jumps.forEach((button) => button.addEventListener('click', () => { stop(); go(+button.dataset.casJump); }));
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); stop(); go(step + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); stop(); go(step - 1); }
    });

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
