import { type DailyStats, type DailyStatsMap, LocalDate } from "@keybr/result";
import { Popup, Portal, useHoverPopup } from "@keybr/widget";
import { useRef } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import * as styles from "./Calendar.module.css";
import { createMemo, For, Show } from 'solid-js';
import { DailyStats as DailyStatsWidget } from "./DailyStats.tsx";
import { type Effort } from "./effort.ts";
export function Calendar(solidProps: {
    dailyStatsMap: DailyStatsMap;
    effort: Effort;
}) {
    const popup = useHoverPopup<{ stats: DailyStats; elem: Element }>();
    return (<>
      <BlockList dailyStatsMap={solidProps.dailyStatsMap} effort={solidProps.effort} onCellHoverIn={(stats, elem) => {
            popup.show({ stats, elem });
        }} onCellHoverOut={popup.leave}/>
      <Show when={popup.state().type === "visible" || popup.state().type === "visible-out" ? popup.state() : null} keyed>
        {(current) => current.type === "hidden" ? null : <Portal>
          <Popup anchor={current.elem} onMouseEnter={popup.hold} onMouseLeave={popup.dismiss}>
            <DailyStatsWidget stats={current.stats} effort={solidProps.effort}/>
          </Popup>
        </Portal>}
      </Show>
    </>);
}
function BlockList(solidProps: {
    dailyStatsMap: DailyStatsMap;
    effort: Effort;
    onCellHoverIn?: (stats: DailyStats, elem: Element) => void;
    onCellHoverOut?: (stats: DailyStats, elem: Element) => void;
    onCellClick?: (stats: DailyStats, elem: Element) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const blocks = createMemo(() => blockList(solidProps.dailyStatsMap));
    return (<div ref={el => ref.current = el} class={styles.root} onMouseOver={(event) => {
            relayEvent(ref.current!, event, solidProps.onCellHoverIn);
        }} onMouseOut={(event) => {
            relayEvent(ref.current!, event, solidProps.onCellHoverOut);
        }} onClick={(event) => {
            relayEvent(ref.current!, event, solidProps.onCellClick);
        }}>
      <For each={blocks()}>{(block) => <Block block={block} effort={solidProps.effort}/>}</For>
    </div>);
}
function relayEvent(root: Element, { target }: {
    target: EventTarget | null;
}, handler?: (stats: DailyStats, elem: Element) => void) {
    while (handler != null &&
        target instanceof Element &&
        root.contains(target)) {
        const stats = Cell.attached(target);
        if (stats) {
            handler(stats, target);
            return;
        }
        target = target.parentElement;
    }
}
type BlockCells = {
    key: string;
    year: number;
    month: number;
    cells: (DailyStats | null)[][];
};
function Block(solidProps: {
    block: BlockCells;
    effort: Effort;
}) {
    const { formatMessage } = useIntl();
    const weekDayName = formatMessage({
        id: "weekDayNames",
        defaultMessage: "M|T|W|T|F|S|S",
    }).split("|");
    return (<div class={styles.calendar}>
      <table class={styles.table}>
        <caption class={styles.caption}>
          {solidProps.block.year}/{solidProps.block.month}
        </caption>
        <thead>
          <tr>
            <th class={styles.headerCell}>{weekDayName[0]}</th>
            <th class={styles.headerCell}>{weekDayName[1]}</th>
            <th class={styles.headerCell}>{weekDayName[2]}</th>
            <th class={styles.headerCell}>{weekDayName[3]}</th>
            <th class={styles.headerCell}>{weekDayName[4]}</th>
            <th class={styles.headerCell}>{weekDayName[5]}</th>
            <th class={styles.headerCell}>{weekDayName[6]}</th>
          </tr>
        </thead>
        <tbody>
          <For each={solidProps.block.cells}>{(row) => <tr>
              <For each={row}>{(cell) => <Cell cell={cell} effort={solidProps.effort}/>}</For>
            </tr>}</For>
        </tbody>
      </table>
    </div>);
}
function Cell(solidProps: {
    cell: DailyStats | null;
    effort: Effort;
}) {
    return (<Show when={solidProps.cell} keyed fallback={<td />}>
      {(cell) => cell.results.length === 0 ? (<td class={styles.cell}>
        <span class={styles.item}>{cell.date.dayOfMonth}</span>
      </td>) : (<td class={styles.cell}>
        <span ref={Cell.attach(cell)} class={styles.item} style={{
            "background-color": String(solidProps.effort.shade(solidProps.effort.effort(cell.stats.time))),
        }} data-date={String(cell.date)}>
          {cell.date.dayOfMonth}
        </span>
      </td>)}
    </Show>);
}
const attachedStats = new WeakMap<Element, DailyStats>();
Cell.attach = (stats: DailyStats) => (target: Element | null): void => {
  if (target) attachedStats.set(target, stats);
};
Cell.attached = (target: Element | null): DailyStats | null =>
  target ? attachedStats.get(target) ?? null : null;
function blockList(map: DailyStatsMap): BlockCells[] {
    const blocks = new Map<string, BlockCells>();
    for (const { date } of map) {
        addBlock(date);
    }
    addBlock(map.today.date);
    return [...blocks.values()];
    function addBlock({ year, month }: LocalDate) {
        const key = `${year}:${month}`;
        let block = blocks.get(key);
        if (block == null) {
            const cells: (DailyStats | null)[][] = [
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
            ];
            const a = new LocalDate(year, month, 1);
            const offset = a.dayOfWeek - 1;
            for (let i = 0; i < 6; i++) {
                for (let j = 0; j < 7; j++) {
                    const b = a.plusDays(i * 7 + j - offset);
                    if (a.month === b.month) {
                        cells[i][j] = map.get(b);
                    }
                }
            }
            blocks.set(key, (block = { key, year, month, cells }));
        }
        return block;
    }
}
