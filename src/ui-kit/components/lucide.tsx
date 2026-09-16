import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { type IconNode, AlarmClockCheck as AlarmClockCheckNode, ArrowUpRight as ArrowUpRightNode, ChartNoAxesColumn as ChartNoAxesColumnNode, Check as CheckNode, ChevronsUpDown as ChevronsUpDownNode, CircleAlert as CircleAlertNode, CircleCheck as CircleCheckNode, CircleHelp as CircleHelpNode, CirclePlay as CirclePlayNode, CircleStop as CircleStopNode, Download as DownloadNode, Frown as FrownNode, House as HouseNode, Info as InfoNode, Maximize2 as Maximize2Node, MoonStar as MoonStarNode, Move as MoveNode, Redo2 as Redo2Node, Search as SearchNode, Settings as SettingsNode, Share as ShareNode, SkipBack as SkipBackNode, SkipForward as SkipForwardNode, Smile as SmileNode, SunMoon as SunMoonNode, Trash2 as Trash2Node, Trophy as TrophyNode, Undo2 as Undo2Node, Upload as UploadNode, X as XNode } from 'lucide';

export type IconProps = JSX.SvgSVGAttributes<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};
export type LucideIcon = (props: IconProps) => JSX.Element;

// Use Lucide's framework-neutral geometry, not its Solid 1 compiled runtime.
// The geometry is static; Solid owns every reactive attribute on the SVG root.
function icon(nodes: IconNode, name: string): LucideIcon {
  return props => <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke={props.color ?? 'currentColor'} stroke-linecap="round" stroke-linejoin="round"
    width={props.size ?? 24} height={props.size ?? 24}
    stroke-width={props.absoluteStrokeWidth ? Number(props.strokeWidth ?? 2) * 24 / Number(props.size ?? 24) : props.strokeWidth ?? 2}
    aria-hidden={props['aria-label'] || props['aria-labelledby'] ? undefined : 'true'}
    {...omit(props, 'size', 'color', 'strokeWidth', 'absoluteStrokeWidth', 'children', 'class')}
    class={['lucide', 'lucide-' + name, props.class]}
  >
    {nodes.map(([tag, attributes]) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
      return element;
    })}
    {props.children}
  </svg>;
}

export const AlarmClockCheck = /* @__PURE__ */ icon(AlarmClockCheckNode, 'alarm-clock-check');
export const ArrowUpRight = /* @__PURE__ */ icon(ArrowUpRightNode, 'arrow-up-right');
export const ChartNoAxesColumn = /* @__PURE__ */ icon(ChartNoAxesColumnNode, 'chart-no-axes-column');
export const Check = /* @__PURE__ */ icon(CheckNode, 'check');
export const ChevronsUpDown = /* @__PURE__ */ icon(ChevronsUpDownNode, 'chevrons-up-down');
export const CircleAlert = /* @__PURE__ */ icon(CircleAlertNode, 'circle-alert');
export const CircleCheck = /* @__PURE__ */ icon(CircleCheckNode, 'circle-check');
export const CircleHelp = /* @__PURE__ */ icon(CircleHelpNode, 'circle-help');
export const CirclePlay = /* @__PURE__ */ icon(CirclePlayNode, 'circle-play');
export const CircleStop = /* @__PURE__ */ icon(CircleStopNode, 'circle-stop');
export const Download = /* @__PURE__ */ icon(DownloadNode, 'download');
export const Frown = /* @__PURE__ */ icon(FrownNode, 'frown');
export const House = /* @__PURE__ */ icon(HouseNode, 'house');
export const Info = /* @__PURE__ */ icon(InfoNode, 'info');
export const Maximize2 = /* @__PURE__ */ icon(Maximize2Node, 'maximize2');
export const MoonStar = /* @__PURE__ */ icon(MoonStarNode, 'moon-star');
export const Move = /* @__PURE__ */ icon(MoveNode, 'move');
export const Redo2 = /* @__PURE__ */ icon(Redo2Node, 'redo2');
export const Search = /* @__PURE__ */ icon(SearchNode, 'search');
export const Settings = /* @__PURE__ */ icon(SettingsNode, 'settings');
export const Share = /* @__PURE__ */ icon(ShareNode, 'share');
export const SkipBack = /* @__PURE__ */ icon(SkipBackNode, 'skip-back');
export const SkipForward = /* @__PURE__ */ icon(SkipForwardNode, 'skip-forward');
export const Smile = /* @__PURE__ */ icon(SmileNode, 'smile');
export const SunMoon = /* @__PURE__ */ icon(SunMoonNode, 'sun-moon');
export const Trash2 = /* @__PURE__ */ icon(Trash2Node, 'trash2');
export const Trophy = /* @__PURE__ */ icon(TrophyNode, 'trophy');
export const Undo2 = /* @__PURE__ */ icon(Undo2Node, 'undo2');
export const Upload = /* @__PURE__ */ icon(UploadNode, 'upload');
export const X = /* @__PURE__ */ icon(XNode, 'x');
