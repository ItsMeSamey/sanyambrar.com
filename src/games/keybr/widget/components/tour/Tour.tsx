import type { JSX } from "@solidjs/web";
import { X } from "../../../../../shared/components/Icons.tsx";
import { useIntl } from "../../../intl/runtime.tsx";
import { useHotkeys } from "../../hooks/use-hotkeys.ts";
import { LinkButton } from "../button/LinkButton.tsx";
import { Icon } from "../icon/Icon.tsx";
import { Backdrop } from "../popup/Backdrop.tsx";
import { Popup } from "../popup/Popup.tsx";
import { Spotlight } from "../popup/Spotlight.tsx";
import { Portal, PortalContainer } from "../portal/Portal.tsx";
import { Meter } from "./Meter.tsx";
import { type SlideProps } from "./Slide.tsx";
import styles from "./Tour.module.css";
import { children, createMemo, omit, createSignal, onCleanup, onSettled } from 'solid-js';
 type TourProps = {
    readonly children?: readonly JSX.Element[];
    readonly onClose?: () => void;
};
export function Tour(allProps: TourProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "onClose");
    const { formatMessage } = useIntl();
    const [slideIndex, setSlideIndex] = createSignal(0);
    let dialog!: HTMLDivElement;
    let focusFrame = 0;
    const priorInert = new Map<HTMLElement, boolean>();
    const resolvedSlides = children(() => local.children);
    const slides = createMemo(() => resolvedSlides.toArray().filter((child): child is HTMLElement => child instanceof HTMLElement));
    const currentSlide = () => slides()[Math.max(0, Math.min(slideIndex(), slides().length - 1))] ?? null;
    const selectPrev = () => {
        if (slideIndex() > 0) {
            setSlideIndex(slideIndex() - 1);
        }
    };
    const selectNext = () => {
        if (slideIndex() < slides().length - 1) {
            setSlideIndex(slideIndex() + 1);
        }
    };
    const close = () => {
        local.onClose?.();
    };
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const onDialogKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const items = focusable();
        if (!items.length) return;
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey
            ? index <= 0 ? items[items.length - 1] : items[index - 1]
            : index < 0 || index === items.length - 1 ? items[0] : items[index + 1];
        event.preventDefault();
        next.focus({ preventScroll: true });
    };
    onSettled(() => {
        const portal = PortalContainer.query();
        for (const sibling of portal.parentElement?.children ?? []) {
            if (!(sibling instanceof HTMLElement) || sibling === portal) continue;
            priorInert.set(sibling, sibling.inert);
            sibling.inert = true;
        }
        focusFrame = requestAnimationFrame(() => {
            if (dialog.isConnected) focusable()[0]?.focus({ preventScroll: true });
        });
    });
    onCleanup(() => {
        cancelAnimationFrame(focusFrame);
        for (const [element, inert] of priorInert) if (element.isConnected) element.inert = inert;
    });
    useHotkeys({
        ["ArrowLeft"]: selectPrev,
        ["ArrowUp"]: selectPrev,
        ["PageUp"]: selectPrev,
        ["Backspace"]: selectPrev,
        ["ArrowRight"]: selectNext,
        ["ArrowDown"]: selectNext,
        ["PageDown"]: selectNext,
        ["Space"]: selectNext,
        ["Escape"]: close,
    });
    const anchor = () => currentSlide()?.dataset.tourAnchor || undefined;
    const position = () => (currentSlide()?.dataset.tourPosition || undefined) as SlideProps["position"];
    return (<Portal>
      <Backdrop>
        <Spotlight anchor={anchor()}/>

        <Popup {...props} anchor={anchor()} position={position()} offset={30}>
          <div ref={el => dialog = el} class={styles.root} role="dialog" aria-modal="true" aria-label={formatMessage({ id: "practice.widget.tour.title", defaultMessage: "Typing tutorial" })} onKeyDown={onDialogKeyDown}>
            {currentSlide()}

            <LinkButton className={styles.close} ariaLabel={formatMessage({ id: "practice.widget.tour.close", defaultMessage: "Close tutorial" })} onClick={close}>
              <Icon shape={X} aria-hidden="true"/>
            </LinkButton>

            <div class={styles.footer}>
              <Meter length={slides().length} slideIndex={slideIndex()}/>

              {slideIndex() > 0 && (<LinkButton className={styles.prev} onClick={selectPrev}>
                  {formatMessage({
                id: "t_Previous",
                defaultMessage: "Previous",
            })}
                </LinkButton>)}

              {(slideIndex() < slides().length - 1 && (<LinkButton className={styles.next} onClick={selectNext}>
                  {formatMessage({
                id: "t_Next",
                defaultMessage: "Next",
            })}
                </LinkButton>)) || (<LinkButton className={styles.next} onClick={close}>
                  {formatMessage({
                id: "t_Close",
                defaultMessage: "Close",
            })}
                </LinkButton>)}
            </div>
          </div>
        </Popup>
      </Backdrop>
    </Portal>);
}
