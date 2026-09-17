import type { JSX } from "@solidjs/web";
import { X } from "../../icons.ts";

import { IconButton } from "../button/IconButton.tsx";
import { Icon } from "../icon/Icon.tsx";
import { useToast } from "./context.tsx";
export function CloseButton(): JSX.Element {
    const toast = useToast();
    return (<IconButton icon={<Icon shape={X}/>} onClick={() => {
            toast.close();
        }}/>);
}
