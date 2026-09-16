import type { JSX } from "@solidjs/web";
import { X } from "../../icons.ts";

import { IconButton } from "../button/index.ts";
import { Icon } from "../icon/index.ts";
import { useToast } from "./context.tsx";
export function CloseButton(): JSX.Element {
    const toast = useToast();
    return (<IconButton icon={<Icon shape={X}/>} onClick={() => {
            toast.close();
        }}/>);
}
