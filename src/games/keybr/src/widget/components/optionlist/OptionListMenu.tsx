import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { createEffect } from "solid-js";
import { ensureVisible } from "../../utils/scroll.ts";
import iconStyles from "../icon/Icon.module.css";
import { type OptionListOption } from "./OptionList.types.ts";
import styles from "./OptionListMenu.module.css";
export function OptionListMenu(props: {
    readonly options: readonly OptionListOption[];
    readonly selectedOption: OptionListOption;
    readonly id: string;
    readonly optionId: (index: number) => string;
    readonly onSelect: (value: OptionListOption) => void;
}): JSX.Element {
    let list: HTMLUListElement | undefined;
    let item: HTMLLIElement | undefined;
    createEffect(() => props.selectedOption, () => ensureVisible(list ?? null, item ?? null));
    return (<ul ref={el => list = el} id={props.id} role="listbox" data-cursor-round="" data-samey-overlay="" class={styles.root}>
      {props.options.map((option, index) => (<li ref={option.value === props.selectedOption.value ? (el => item = el) : undefined} id={props.optionId(index)} role="option" aria-selected={option.value === props.selectedOption.value ? "true" : "false"} class={clsx(styles.item, iconStyles.altIcon, option.value === props.selectedOption.value && styles.itemSelected)} onClick={(event) => {
                event.preventDefault();
                props.onSelect(option);
            }}>
          {option.name}
        </li>))}
    </ul>);
}
