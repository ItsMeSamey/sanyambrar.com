import { X } from "../../icons.ts";
import { type ReactNode } from "@keybr/solid-compat/react";
import { IconButton } from "../button/index.ts";
import { Icon } from "../icon/index.ts";
import { useToast } from "./context.tsx";
export function CloseButton(): ReactNode {
    const toast = useToast();
    return (<IconButton icon={<Icon shape={X}/>} onClick={() => {
            toast.close();
        }}/>);
}
