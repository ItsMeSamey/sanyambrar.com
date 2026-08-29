import { Tasks } from "@keybr/lang";
import { type DailyStats, type DailyStatsMap, LocalDate } from "@keybr/result";
import { Popup, Portal } from "@keybr/widget";
import { useEffect, useRef, useState } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import * as styles from "./Calendar.module.css";
import { createMemo, For, Show } from "solid-js";
import { DailyStats as DailyStatsWidget } from "./DailyStats.tsx";
import { type Effort } from "./effort.ts";
export function Calendar(solidProps: {
    dailyStatsMap: DailyStatsMap;
    effort: Effort;
}) {
    const [state, setState] = useState<any>({ type: "hidden" });
    useEffect(() => {
        const tasks = new Tasks();
        switch (state().type) {
            case "visible-in":
                tasks.delayed(300, () => {
                    setState({ ...state(), type: "visible" });
                });
                break;
            case "visible-out":
                tasks.delayed(300, () => {
                    setState({ type: "hidden" });
                });
                break;
        }
        return () => {
            tasks.cancelAll();
        };
    }, () => [state()]);
    return (<>
      <BlockList dailyStatsMap={solidProps.dailyStatsMap} effort={solidProps.effort} onCellHoverIn={(stats, elem) => {
            setState({ type: "visible-in", stats, elem });
        }} onCellHoverOut={() => {
            switch (state().type) {
                case "visible-in":
                    setState({ type: "hidden" });
                    break;
                case "visible":
                    setState({ ...state(), type: "visible-out" });
                    break;
            }
        }}/>
      {(state().type === "visible" || state().type === "visible-out") && (<Portal>
          <Popup anchor={state().elem} onMouseEnter={() => {
                setState({ ...state(), type: "visible" });
            }} onMouseLeave={() => {
                setState({ ...state(), type: "visible-out" });
            }}>
            <DailyStatsWidget stats={state().stats} effort={solidProps.effort}/>
          </Popup>
        </Portal>)}
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
    target: any;
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
const attachment = Symbol();
Cell.attach = (stats: DailyStats) => {
    return (target: Element | null): void => {
        if (target != null) {
            (target as any)[attachment] = stats;
        }
    };
};
Cell.attached = (target: Element | null): DailyStats | null => {
    return (target as any)?.[attachment] ?? null;
};
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
