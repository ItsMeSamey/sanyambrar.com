import type { JSX } from "@solidjs/web";

import { useHotkeysHandler } from "../../hooks/use-hotkeys.ts";
import { type OptionListProps } from "./OptionList.types.ts";
import { OptionListButton } from "./OptionListButton.tsx";
import { OptionListMenu } from "./OptionListMenu.tsx";
import { omit, createSignal, createUniqueId } from 'solid-js';
export function OptionList(allProps: OptionListProps): JSX.Element {
    const local = allProps, props = omit(allProps, "disabled", "options", "label", "size", "tabIndex", "title", "value", "onBlur", "onFocus", "onSelect");
    const [focused, setFocused] = createSignal(false);
    const id = createUniqueId();
    const listboxId = `${id}-listbox`;
    const optionId = (index: number) => `${id}-option-${index}`;
    const { open, setOpen, option, selectedOption, handleOpen, handleNavigate, handleSelect, } = useOptionList(local);
    const activeOptionId = () => {
        const selected = selectedOption();
        const index = local.options.findIndex((candidate) => candidate.value === selected.value);
        return index >= 0 ? optionId(index) : undefined;
    };
    return (<OptionListButton {...props} focused={focused()} open={open()} option={option()} label={local.label} listboxId={listboxId} activeOptionId={activeOptionId()} size={local.size} tabIndex={local.tabIndex} title={local.title} onBlur={(event) => {
            if (!local.disabled) {
                setFocused(false);
                setOpen(false);
                if (local.onBlur != null) {
                    local.onBlur(event);
                }
            }
        }} onFocus={(event) => {
            if (!local.disabled) {
                setFocused(true);
                if (local.onFocus != null) {
                    local.onFocus(event);
                }
            }
        }} onKeyDown={useHotkeysHandler({
            ["Space"]: () => open() ? handleSelect() : handleOpen(),
            ["Enter"]: () => open() ? handleSelect() : handleOpen(),
            ["Escape"]: () => setOpen(false),
            ["Home"]: () => handleNavigate("first"),
            ["ArrowUp"]: () => handleNavigate("prev"),
            ["ArrowDown"]: () => handleNavigate("next"),
            ["End"]: () => handleNavigate("last"),
        })} onClick={(event) => {
            event.preventDefault();
            handleOpen();
        }}>
      {open() && (<OptionListMenu options={local.options} selectedOption={selectedOption()} id={listboxId} optionId={optionId} onSelect={(option) => {
                setOpen(false);
                if (local.onSelect != null) {
                    local.onSelect(option.value);
                }
            }}/>)}
    </OptionListButton>);
}
function useOptionList(props: Pick<OptionListProps, "options" | "disabled" | "value" | "onSelect">) {
    const option = () => props.options.find((option) => option.value === props.value) ?? {
        value: "",
        name: "-",
    };
    const [open, setOpen] = createSignal(false);
    const [selectedValue, setSelectedValue] = createSignal(props.value);
    const selectedOption = () => props.options.find((candidate) => candidate.value === selectedValue()) ?? option();
    const handleOpen = () => {
        if (props.disabled) {
            return;
        }
        if (!open()) {
            setOpen(true);
            setSelectedValue(option().value);
        }
        else {
            setOpen(false);
        }
    };
    const handleNavigate = (dir: "first" | "prev" | "next" | "last") => {
        if (props.disabled) {
            return;
        }
        if (!open()) {
            setOpen(true);
            setSelectedValue(option().value);
        }
        else {
            const { length } = props.options;
            if (!length) return;
            let index = props.options.findIndex((candidate) => candidate.value === selectedValue());
            if (index === -1) {
                index = 0;
            }
            switch (dir) {
                case "first":
                    index = 0;
                    break;
                case "prev":
                    index -= 1;
                    if (index < 0) {
                        index = length - 1;
                    }
                    break;
                case "next":
                    index += 1;
                    if (index >= length) {
                        index = 0;
                    }
                    break;
                case "last":
                    index = length - 1;
                    break;
            }
            setSelectedValue(props.options[index].value);
        }
    };
    const handleSelect = () => {
        if (props.disabled) {
            return;
        }
        if (open()) {
            setOpen(false);
            if (props.onSelect != null) {
                props.onSelect(selectedValue());
            }
        }
    };
    return {
        open,
        setOpen,
        option,
        selectedOption,
        handleOpen,
        handleNavigate,
        handleSelect,
    };
}
