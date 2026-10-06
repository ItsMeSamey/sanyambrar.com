import { ArrowRight, X, createElement } from 'lucide';

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
    const codeLine = $('cas-code-line');
    const jumps = [...root.querySelectorAll<HTMLElement>('[data-cas-jump]')];

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
        tag: 'A', kind: '', event: 'A sets expected to false, the value of an unlocked flag.',
        caption: 'A tries to change the flag from false to true.'
      },
      {
        atom: true, owners: ['A'], aState: 'owner', bState: 'waiting',
        aExpected: 'false', bExpected: 'false',
        aInstruction: 'CAS(false → true) → success', bInstruction: 'not contending yet',
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
        atom: true, owners: ['A'], aState: 'inside', bState: 'owner?',
        aExpected: 'false', bExpected: 'true',
        aInstruction: 'inside critical section', bInstruction: 'CAS(true → true) → success',
        tag: 'CAS success', kind: 'breach', event: 'Now the comparison is true == true. The CAS succeeds, but the flag stays true and A has not released the lock.',
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
      eventTag.textContent = s.tag;
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

    const go = (next: number) => {
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
    jumps.forEach((button) => button.addEventListener('click', () => { stop(); go(Number(button.dataset.casJump)); }));
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); stop(); go(step + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); stop(); go(step - 1); }
    });

    paint();
  }

  const ordering = document.getElementById('ordering-viz');
  if (ordering) {
    const buttons = [...ordering.querySelectorAll<HTMLElement>('[data-order]')];
    const release = $('release-op');
    const acquire = $('acquire-op');
    const arrow = $('hb-arrow');
    const caption = $('ordering-caption');
    const setMode = (mode?: string) => {
      buttons.forEach(b => b.classList.toggle('on', b.dataset.order === mode));
      const fixed = mode === 'fixed';
      release.innerHTML = fixed ? 'active = false<small>release</small>' : 'active = false<small>relaxed / no release edge</small>';
      acquire.innerHTML = fixed ? 'wait observes false<small>acquire</small>' : 'wait observes false<small>relaxed / no acquire edge</small>';
      arrow.replaceChildren(createElement(fixed ? ArrowRight : X, { 'aria-hidden': 'true', width: 24, height: 24 }));
      arrow.setAttribute('role', 'img');
      arrow.setAttribute('aria-label', fixed ? 'Synchronized hand-off' : 'Missing synchronization');
      arrow.className = `hb ${fixed ? 'good' : 'bad'}`;
      caption.textContent = fixed
        ? 'The wait sees the runner\'s release. Its acquire ordering makes the runner\'s earlier writes visible before the UI uses them.'
        : 'The UI sees the flag change, but the relaxed operations do not order the runner\'s writes before the UI reads shared state.';
    };
    buttons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.order)));
    setMode('old');
  }
})();
