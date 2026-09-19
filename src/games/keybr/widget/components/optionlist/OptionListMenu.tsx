import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { createEffect } from "solid-js";
import { useScreenSize } from "../../hooks/use-screen-size.ts";
import iconStyles from "../icon/Icon.module.css";
import { type OptionListOption } from "./OptionList.types.ts";
import styles from "./OptionListMenu.module.css";
const ensureVisible = (list: HTMLElement | null, item: HTMLElement | null): void => {
    if (list == null || item == null) return;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.offsetHeight)
        list.scrollTop = item.offsetTop + item.offsetHeight - list.offsetHeight;
};

export function OptionListMenu(props: {
    readonly options: readonly OptionListOption[];
    readonly selectedOption: OptionListOption;
    readonly id: string;
    readonly optionId: (index: number) => string;
    readonly onSelect: (value: OptionListOption) => void;
}): JSX.Element {
    let list: HTMLUListElement | undefined;
    let item: HTMLLIElement | undefined;
    const screenSize = useScreenSize();
    createEffect(() => ({ selectedOption: props.selectedOption, screenSize: screenSize() }), ({ screenSize }) => {
        const anchor = list?.parentElement;
        if (list == null || anchor == null) return;
        const margin = 8;
        list.style.removeProperty("--option-list-available-block");
        list.dataset.side = "below";
        const below = Math.max(0, screenSize.height - list.getBoundingClientRect().top - margin);
        list.dataset.side = "above";
        const above = Math.max(0, list.getBoundingClientRect().bottom - margin);
        const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const desired = Math.min(list.scrollHeight, rootFontSize * 20);
        const side = below < desired && above > below ? "above" : "below";
        list.dataset.side = side;
        list.style.setProperty("--option-list-available-block", `${side === "above" ? above : below}px`);
        ensureVisible(list, item ?? null);
    });
    return (<ul ref={el => list = el} id={props.id} role="listbox" data-cursor-round="" data-samey-overlay="" class={styles.root}>
      {props.options.map((option, index) => (<li ref={option.value === props.selectedOption.value ? (el => item = el) : undefined} id={props.optionId(index)} role="option" aria-selected={option.value === props.selectedOption.value ? "true" : "false"} class={clsx(styles.item, iconStyles.altIcon, option.value === props.selectedOption.value && styles.itemSelected)} onClick={(event) => {
                event.preventDefault();
                props.onSelect(option);
            }}>
          {option.name}
        </li>))}
    </ul>);
}
