import { For, Show } from 'solid-js';
import { ChallengeGame } from './Challenges.tsx';
import type { ChallengeDefinition } from './challenge-types.ts';
import type { GameProps } from './types.ts';
import { createPaperFoldingQuestion, describePaperPattern, paperSize, wholePaper, type PaperBounds, type PaperFold, type PaperFoldingQuestion, type PaperPoint } from './paper-folding-model.ts';
import './paper-folding.css';

function Sheet(props: { bounds: PaperBounds; class?: string }) {
  return <rect class={props.class} x={props.bounds.left} y={props.bounds.top} width={props.bounds.right - props.bounds.left} height={props.bounds.bottom - props.bounds.top}/>;
}

function FoldDiagram(props: { fold: PaperFold }) {
  const horizontal = () => props.fold.direction === 'left' || props.fold.direction === 'right';
  const moving = (): PaperBounds => {
    const { before, crease, direction } = props.fold;
    return { ...before, ...(direction === 'right' ? { right: crease } : direction === 'left' ? { left: crease } : direction === 'down' ? { bottom: crease } : { top: crease }) };
  };
  const arrow = () => {
    const { before, direction } = props.fold;
    const cx = (before.left + before.right) / 2, cy = (before.top + before.bottom) / 2;
    const length = (horizontal() ? before.right - before.left : before.bottom - before.top) / 4;
    const sign = direction === 'right' || direction === 'down' ? 1 : -1;
    return horizontal()
      ? `M${cx - sign * length} ${cy}Q${cx} ${cy - 10} ${cx + sign * length} ${cy}m${-sign * 3} -4l${sign * 3} 4l${-sign * 4} 1`
      : `M${cx} ${cy - sign * length}Q${cx + 10} ${cy} ${cx} ${cy + sign * length}m4 ${-sign * 3}l-4 ${sign * 3}l-1 ${-sign * 4}`;
  };
  return <svg class="ai-folding-sheet" viewBox="-4 -4 72 72" role="img" aria-label={`Fold the ${props.fold.direction === 'right' ? 'left' : props.fold.direction === 'left' ? 'right' : props.fold.direction === 'down' ? 'top' : 'bottom'} half of the remaining paper ${props.fold.direction}. The dashed line is the crease.`}>
    <Sheet bounds={wholePaper} class="ai-folding-outline"/>
    <Sheet bounds={props.fold.before} class="ai-folding-paper"/>
    <Sheet bounds={moving()} class="ai-folding-moving"/>
    <Show when={horizontal()} fallback={<path class="ai-folding-crease" d={`M${props.fold.before.left} ${props.fold.crease}H${props.fold.before.right}`}/>}>
      <path class="ai-folding-crease" d={`M${props.fold.crease} ${props.fold.before.top}V${props.fold.before.bottom}`}/>
    </Show>
    <path class="ai-folding-arrow" d={arrow()}/>
  </svg>;
}

function HoleDiagram(props: { holes: readonly PaperPoint[]; bounds?: PaperBounds; label?: string }) {
  return <svg class="ai-folding-sheet" viewBox="-4 -4 72 72" role={props.label ? 'img' : undefined} aria-label={props.label} aria-hidden={props.label ? undefined : 'true'}>
    <Show when={props.bounds}><Sheet bounds={wholePaper} class="ai-folding-outline"/></Show>
    <Sheet bounds={props.bounds ?? wholePaper} class="ai-folding-paper"/>
    <For each={props.holes}>{([x, y]) => <circle class="ai-folding-hole" cx={x} cy={y} r={paperSize / 42}/>}</For>
  </svg>;
}

function PaperPrompt(props: { question: PaperFoldingQuestion }) {
  return <div class="ai-folding-sequence">
    <For each={props.question.folds}>{(fold, index) => <figure>
      <FoldDiagram fold={fold}/><figcaption><span>{index() + 1}</span> Fold {fold.direction}</figcaption>
    </figure>}</For>
    <figure class="ai-folding-punch">
      <HoleDiagram bounds={props.question.folds.at(-1)!.after} holes={props.question.punches} label={`Punch through all layers. ${describePaperPattern(props.question.punches)}.`}/>
      <figcaption><span>{props.question.folds.length + 1}</span> Punch</figcaption>
    </figure>
  </div>;
}

export const paperFoldingDefinition: ChallengeDefinition<PaperFoldingQuestion> = {
  id: 'paper-folding',
  instruction: 'Follow the folds in order, then imagine the marked holes punched through every layer. Choose where all the holes land when the paper unfolds.',
  createQuestion: createPaperFoldingQuestion,
  Prompt: PaperPrompt,
  Option: props => <span class="ai-folding-option"><HoleDiagram holes={props.question.patterns[props.index]}/></span>,
};

export default function PaperFolding(props: GameProps) {
  return <ChallengeGame {...props} definition={paperFoldingDefinition}/>;
}
