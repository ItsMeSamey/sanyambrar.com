import { splitProps, type ComponentProps } from 'solid-js';

type SmartLinkProps = ComponentProps<'a'> & { preload?: boolean };

function prefetch(href: string | undefined) {
  if (!href) return;
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    const api = globalThis as typeof globalThis & {
      SameySolidPreload?: (href: string) => void;
      SameyPreloadPage?: (href: string) => void;
    };
    if (api.SameySolidPreload) api.SameySolidPreload(url.href);
    else api.SameyPreloadPage?.(url.href);
  } catch {}
}

export function SmartLink(props: SmartLinkProps) {
  const [local, rest] = splitProps(props, ['href', 'preload', 'onPointerEnter', 'onPointerDown', 'onFocus']);
  const shouldPreload = () => local.preload !== false;
  return <a
    {...rest}
    href={local.href}
    onPointerEnter={event => {
      if (shouldPreload()) prefetch(local.href);
      if (typeof local.onPointerEnter === 'function') local.onPointerEnter(event);
    }}
    onPointerDown={event => {
      if (shouldPreload()) prefetch(local.href);
      if (typeof local.onPointerDown === 'function') local.onPointerDown(event);
    }}
    onFocus={event => {
      if (shouldPreload()) prefetch(local.href);
      if (typeof local.onFocus === 'function') local.onFocus(event);
    }}
  />;
}
