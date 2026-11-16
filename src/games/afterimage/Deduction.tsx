import { createSignal, For, onSettled, Show } from 'solid-js';
import { SegmentedControl } from '../keybr/widget/components/segmented/SegmentedControl.tsx';
import { ChallengeGame } from './Challenges.tsx';
import type { ChallengeDefinition } from './challenge-types.ts';
import type { GameProps } from './types.ts';
import { createDeductionQuestion, deductionOrdinal, type DeductionMode, type DeductionQuestion } from './deduction-core.ts';
import { pairArtwork } from './pair-objects.ts';
import './deduction.css';

function DeductionSymbol(props: { question: DeductionQuestion; tile: string }) {
  return <span class="ai-deduction-symbol" aria-hidden="true"><Show when={props.question.objects[props.tile]} keyed fallback={props.tile}>{object => <svg viewBox={object.viewBox} class="ai-deduction-object" aria-hidden="true" innerHTML={pairArtwork(object)}/>}</Show></span>;
}
function DeductionArrow(props: { reverse?: boolean }) {
  return <svg class="ai-deduction-arrow" viewBox="0 0 48 24" aria-hidden="true"><path d="M5 12H41M33 4L41 12 33 20" transform={props.reverse ? 'translate(48 0) scale(-1 1)' : undefined}/></svg>;
}
export function DeductionPrompt(props: { question: DeductionQuestion }) {
  return <div class="ai-deduction">
    <div class="ai-deduction-tiles" aria-label={`Tiles: ${props.question.tiles.join(', ')}`}>
      <For each={props.question.tiles}>{tile => <DeductionSymbol question={props.question} tile={tile}/>}</For>
    </div>
    <p class="ai-deduction-legend">Arrows mean before</p>
    <div class="ai-deduction-premises" role="list" aria-label="Given rules">
      <For each={props.question.premises}>{premise => <div class="ai-deduction-premise" role="listitem" aria-label={`${premise.before} comes before ${premise.after}`}>
        <DeductionSymbol question={props.question} tile={premise.reverse ? premise.after : premise.before}/>
        <DeductionArrow reverse={premise.reverse}/>
        <DeductionSymbol question={props.question} tile={premise.reverse ? premise.before : premise.after}/>
      </div>}</For>
    </div>
    <p class="ai-deduction-question">Which must be true?</p>
  </div>;
}

export function DeductionOption(props: { question: DeductionQuestion; index: number }) {
  return <Show when={props.question.claims[props.index]} keyed>{claim => <span class="ai-deduction-choice" aria-hidden="true">
    {claim.kind === 'before' ? <><DeductionSymbol question={props.question} tile={claim.before}/><DeductionArrow/><DeductionSymbol question={props.question} tile={claim.after}/></> : <><DeductionSymbol question={props.question} tile={claim.tile}/><span class="ai-deduction-position">{deductionOrdinal(claim.position)}</span></>}
  </span>}</Show>;
}
export function deductionDefinitionFor(mode: DeductionMode): ChallengeDefinition<DeductionQuestion> {
  return {
    id: 'deduction', scope: `deduction-v3-${mode}-60s`, rulesVersion: 3,
    instruction: 'Arrows point from earlier to later, not necessarily adjacent. Choose what must be true. Rules build from two to four, then include positions.',
    createQuestion: (round, random) => createDeductionQuestion(round, random, mode),
    Prompt: DeductionPrompt, Option: DeductionOption,
  };
}
export const deductionDefinition = deductionDefinitionFor('letters');

const preferenceKey = 'afterimage-deduction-symbols';
function savedMode(): DeductionMode {
  try { return localStorage.getItem(preferenceKey) === 'images' ? 'images' : 'letters'; }
  catch { return 'letters'; }
}
export function DeductionGame(props: GameProps) {
  const [mode, setMode] = createSignal<DeductionMode>(savedMode());
  const [active, setActive] = createSignal(false);
  function changeMode(next: DeductionMode) {
    if (active() || next === mode()) return;
    try { localStorage.setItem(preferenceKey, next); } catch { /* A blocked preference store must not prevent playing. */ }
    setMode(next); props.onScopeChange?.(`deduction-v3-${next}-60s`);
  }
  onSettled(() => { props.onScopeChange?.(`deduction-v3-${mode()}-60s`); });
  return <div class="ai-deduction-game">
    <div class="ai-deduction-settings"><SegmentedControl<DeductionMode> label="Deduction symbols" value={mode()} options={[{ value: 'letters', label: 'Letters' }, { value: 'images', label: 'Images' }]} disabled={active()} onChange={changeMode}/></div>
    <Show when={mode()} keyed>{selected => <ChallengeGame {...props} definition={deductionDefinitionFor(selected)} onActivityChange={playing => { setActive(playing); props.onActivityChange?.(playing); }} onFinish={result => { setActive(false); props.onFinish(result); }}/>}</Show>
  </div>;
}
