import type { JSX } from '@solidjs/web';

export type GameId = 'visual' | 'sequence' | 'sequence-fresh' | 'reverse' | 'reverse-fresh' | 'number' | 'verbal' | 'chimp' | 'pairs' | 'reaction' | 'aim' | 'typing' | 'cps' | 'number-order' | 'stroop' | 'arithmetic' | 'rotation' | 'patterns' | 'search' | 'paper-folding' | 'deduction' | 'colour-match';
export type InputKind = 'mouse' | 'touch' | 'pen' | 'keyboard';
export type GameResult = {
  value: number;
  scope: string;
  unit: string;
  lowerIsBetter?: boolean;
  details?: Record<string, number | string>;
};
export type GameProps = {
  id: GameId;
  onFinish: (result: GameResult) => void;
  onScopeChange?: (scope: string) => void;
  onActivityChange?: (active: boolean) => void;
};
export type Stat = { label: string; value: string | number; lives?: boolean };
export type GameComponent = (props: GameProps) => JSX.Element;
