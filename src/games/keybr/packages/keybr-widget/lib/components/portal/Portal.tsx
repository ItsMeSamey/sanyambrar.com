import { type JSX } from '@solidjs/web';
import { Portal as SolidPortal } from '@solidjs/web';
import { querySelector } from "../../utils/query.ts";

export function Portal(props: { readonly children: JSX.Element; readonly key?: null | string }): JSX.Element {
  return <SolidPortal mount={PortalContainer.query()}>{props.children}</SolidPortal>;
}

export function PortalContainer(): JSX.Element {
  return <div id={PortalContainer.id} />;
}
PortalContainer.id = "keybr-portal";
PortalContainer.query = () => querySelector(`#${PortalContainer.id}`);
