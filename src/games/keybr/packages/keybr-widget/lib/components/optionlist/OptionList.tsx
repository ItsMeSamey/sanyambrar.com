import { type ReactNode, useState } from "@keybr/solid-compat/react";
import { useHotkeysHandler } from "../../hooks/use-hotkeys.ts";
import { type OptionListProps } from "./OptionList.types.ts";
import { OptionListButton } from "./OptionListButton.tsx";
import { OptionListMenu } from "./OptionListMenu.tsx";
import { splitProps } from "solid-js";
export function OptionList(solidAllProps: OptionListProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["disabled", "options", "size", "tabIndex", "title", "value", "onBlur", "onFocus", "onSelect"]);
    const [focused, setFocused] = useState(false);
    const { open, setOpen, option, selectedOption, handleOpen, handleNavigate, handleSelect, } = useOptionList(solidLocal);
    return (<OptionListButton {...props} focused={focused()} open={open()} option={option()} size={solidLocal.size} tabIndex={solidLocal.tabIndex} title={solidLocal.title} onBlur={(event) => {
            if (!solidLocal.disabled) {
                setFocused(false);
                setOpen(false);
                if (solidLocal.onBlur != null) {
                    solidLocal.onBlur(event);
                }
            }
        }} onFocus={(event) => {
            if (!solidLocal.disabled) {
                setFocused(true);
                if (solidLocal.onFocus != null) {
                    solidLocal.onFocus(event);
                }
            }
        }} onKeyDown={useHotkeysHandler({
            ["Space"]: handleOpen,
            ["Enter"]: handleSelect,
            ["Home"]: () => handleNavigate("first"),
            ["ArrowUp"]: () => handleNavigate("prev"),
            ["ArrowDown"]: () => handleNavigate("next"),
            ["End"]: () => handleNavigate("last"),
        })} onClick={(event) => {
            event.preventDefault();
            handleOpen();
        }}>
      {open() && (<OptionListMenu options={solidLocal.options} selectedOption={selectedOption()} onSelect={(option) => {
                setOpen(false);
                if (solidLocal.onSelect != null) {
                    solidLocal.onSelect(option.value);
                }
            }}/>)}
    </OptionListButton>);
}
function useOptionList(props: Pick<OptionListProps, "options" | "disabled" | "value" | "onSelect">) {
    const option = () => props.options.find((option) => option.value === props.value) ?? {
        value: "",
        name: "-",
    };
    const [open, setOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(option());
    const handleOpen = () => {
        if (props.disabled) {
            return;
        }
        if (!open()) {
            setOpen(true);
            setSelectedOption(option());
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
            setSelectedOption(option());
        }
        else {
            const { length } = props.options;
            let index = props.options.indexOf(selectedOption());
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
            setSelectedOption(props.options[index]);
        }
    };
    const handleSelect = () => {
        if (props.disabled) {
            return;
        }
        if (open()) {
            setOpen(false);
            if (props.onSelect != null) {
                props.onSelect(selectedOption().value);
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
