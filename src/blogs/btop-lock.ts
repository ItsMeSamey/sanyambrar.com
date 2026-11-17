import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X, createElement } from 'lucide';

import { highlightArticleCode } from '../shared/article-code';

import './btop-mutex.css';
(() => {
  highlightArticleCode();
  const $ = (id: string) => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing #${id}`);
    return element;
  };
  const root = document.getElementById('cas-viz');
  if (root) {
    const pill = $('atom-pill');
    const owners = $('owners');
    const ownerSlots = [...$('owner-slots').children];
    const caption = $('cas-caption');
    const status = $('cas-status');
    const eventBox = $('cas-event');
    const eventTag = eventBox.querySelector<HTMLElement>('.event-tag');
    if (!eventTag) throw new Error('Missing .event-tag');
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
    const previous = $('cas-prev');
    const next = $('cas-step');
    const reset = $('cas-reset');
    const playLabel = $('cas-play-label');
    const playIcon = play.querySelector<HTMLElement>('.control-icon');
    if (!playIcon) throw new Error('Missing play icon');
    const codeLine = $('cas-code-line');
    const jumps = [...root.querySelectorAll<HTMLElement>('[data-cas-jump]')];
    for (const [name, icon] of [['previous', ChevronLeft], ['next', ChevronRight], ['reset', RotateCcw]] as const) {
      root.querySelector(`[data-cas-icon="${name}"]`)?.replaceChildren(createElement(icon, { 'aria-hidden': 'true', width: 15, height: 15 }));
    }

    const states = [
      {
        atom: false, owners: [], aState: 'waiting', bState: 'waiting',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'ready to acquire', bInstruction: 'waiting to run',
        tag: 'ready', kind: '', event: 'The atomic is false. The critical section is empty.',
        caption: 'The lock is available.'
      },
      {
        atom: false, owners: [], aState: 'running', bState: 'waiting',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'expected = false', bInstruction: 'waiting to run',
        tag: 'A', kind: '', event: 'A sets expected to false, the value of an unlocked flag.',
        caption: 'A tries to change the flag from false to true.'
      },
      {
        atom: true, owners: ['A'], aState: 'owner', bState: 'waiting',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'CAS(false → true) → success', bInstruction: 'waiting to run',
        tag: 'A', kind: '', event: 'The comparison matches, so A changes the flag to true and enters the critical section.',
        caption: 'A has the lock.'
      },
      {
        atom: true, owners: ['A'], aState: 'inside', bState: 'running',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'inside critical section', bInstruction: 'expected = false',
        tag: 'B', kind: '', event: 'B arrives while A is still in the critical section.',
        caption: 'B tries to acquire the lock while A holds it.'
      },
      {
        atom: true, owners: ['A'], aState: 'inside', bState: 'retry',
        aExpected: 'false', bExpected: 'true',
        aInstruction: 'inside critical section', bInstruction: 'CAS(false → true) → fail',
        tag: 'CAS fail', kind: 'fail', event: 'B sees true, so the CAS fails. The failed CAS writes true back into B\'s expected argument.',
        caption: 'B retries with expected still set to true.'
      },
      {
        atom: true, owners: ['A'], aState: 'inside', bState: 'acquired',
        aExpected: 'false', bExpected: 'true',
        aInstruction: 'inside critical section', bInstruction: 'CAS(true → true) → success',
        tag: 'CAS success', kind: 'breach', event: 'The comparison is true == true. B succeeds with a true → true exchange while A still owns the lock.',
        caption: 'B gets a successful result while A still holds the lock.'
      },
      {
        atom: true, owners: ['A', 'B'], aState: 'inside', bState: 'inside',
        aExpected: 'false', bExpected: 'true',
        aInstruction: 'inside critical section', bInstruction: 'inside critical section',
        tag: 'broken', kind: 'breach', event: 'Both threads enter code that assumes exclusive access.',
        caption: 'The flag says locked. Both threads think they own it.'
      }
    ];

    let step = 0;
    let timer: number | null = null;

    const syncControls = () => {
      const playing = timer !== null;
      playLabel.textContent = playing ? 'Pause' : step === states.length - 1 ? 'Replay' : 'Play';
      play.setAttribute('aria-label', playing ? 'Pause simulation' : step === states.length - 1 ? 'Replay simulation' : 'Play simulation');
      playIcon.replaceChildren(createElement(playing ? Pause : Play, { 'aria-hidden': 'true', width: 15, height: 15 }));
      previous.setAttribute('aria-disabled', String(step === 0));
      next.setAttribute('aria-disabled', String(step === states.length - 1));
      reset.setAttribute('aria-disabled', String(step === 0 && !playing));
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
      syncControls();
    };
    addEventListener('samey-pageleave', stop);
    addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    const visibility = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) stop();
    });
    visibility.observe(root);

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
      eventTag.textContent = s.tag;
      eventText.textContent = s.event;
      caption.textContent = s.caption;
      count.textContent = `Step ${step} / ${states.length - 1}`;
      status.textContent = `Step ${step} of ${states.length - 1}. ${s.event} ${s.caption}`;
      codeLine.classList.toggle('hotline', step >= 2 && step <= 5);

      jumps.forEach((button, i) => {
        button.classList.toggle('done', i < step);
        button.classList.toggle('current', i === step);
        button.setAttribute('aria-current', i === step ? 'step' : 'false');
      });
      syncControls();
    };

    const go = (next: number) => {
      step = Math.max(0, Math.min(states.length - 1, next));
      paint();
      if (step === states.length - 1) stop();
    };

    next.addEventListener('click', () => { if (step < states.length - 1) { stop(); go(step + 1); } });
    previous.addEventListener('click', () => { if (step > 0) { stop(); go(step - 1); } });
    reset.addEventListener('click', () => { if (step > 0 || timer !== null) { stop(); go(0); } });
    play.addEventListener('click', () => {
      if (timer !== null) return stop();
      if (step === states.length - 1) step = 0;
      timer = setInterval(() => go(step + 1), 1600);
      paint();
    });
    jumps.forEach((button) => button.addEventListener('click', () => { stop(); go(Number(button.dataset.casJump)); }));
    root.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
      const target = event.key === 'ArrowRight' ? step + 1
        : event.key === 'ArrowLeft' ? step - 1
          : event.key === 'Home' ? 0
            : event.key === 'End' ? states.length - 1 : null;
      if (target !== null) { event.preventDefault(); stop(); go(target); }
      else if (event.key === 'Escape' && timer !== null) { event.preventDefault(); stop(); }
    });

    paint();
  }

  const ordering = document.getElementById('ordering-viz');
  if (ordering) {
    const buttons = [...ordering.querySelectorAll<HTMLElement>('[data-order]')];
    const release = $('release-op');
    const acquire = $('acquire-op');
    const arrow = $('hb-arrow');
    const arrowIcon = $('hb-icon');
    const arrowLabel = $('hb-label');
    const caption = $('ordering-caption');
    const setMode = (mode?: string) => {
      buttons.forEach(button => {
        const selected = button.dataset.order === mode;
        button.classList.toggle('on', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      const fixed = mode === 'fixed';
      release.innerHTML = fixed ? 'active = false<small>release store</small>' : 'active = false<small>seq_cst store · includes release</small>';
      acquire.innerHTML = fixed ? 'wait observes false<small>acquire load</small>' : 'wait observes false<small>relaxed load</small>';
      arrowIcon.replaceChildren(createElement(fixed ? ArrowRight : X, { 'aria-hidden': 'true', width: 24, height: 24 }));
      arrowLabel.textContent = fixed ? 'Synchronized' : 'Unsynchronized';
      arrow.className = `hb ${fixed ? 'good' : 'bad'}`;
      caption.textContent = fixed
        ? 'When the acquire wait observes the runner\'s release, its earlier writes happen before the UI accesses shared state.'
        : 'The runner\'s store has release semantics. The relaxed wait leaves its earlier writes unsynchronized with the UI\'s access.';
    };
    buttons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.order)));
    setMode('old');
  }
})();
