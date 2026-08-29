import { mdiClose } from "@keybr/solid-compat/mdi";
import { Children, type ReactElement, type ReactNode, useState } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { useHotkeys } from "../../hooks/use-hotkeys.ts";
import { LinkButton } from "../button/LinkButton.tsx";
import { Icon } from "../icon/Icon.tsx";
import { Backdrop } from "../popup/Backdrop.tsx";
import { Popup } from "../popup/Popup.tsx";
import { Spotlight } from "../popup/Spotlight.tsx";
import { Portal } from "../portal/Portal.tsx";
import { Meter } from "./Meter.tsx";
import { type SlideProps } from "./Slide.tsx";
import * as styles from "./Tour.module.css";
import { splitProps } from "solid-js";
export type TourProps = {
    readonly children?: readonly ReactElement<SlideProps>[];
    readonly onClose?: () => void;
};
export function Tour(solidAllProps: TourProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["children", "onClose"]);
    const { formatMessage } = useIntl();
    const [slideIndex, setSlideIndex] = useState(0);
    const slides = Children.toArray(solidLocal.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    const { length } = slides;
    if (length > 0 && slideIndex() > length - 1) {
        setSlideIndex(length - 1);
    }
    if (length > 0 && slideIndex() < 0) {
        setSlideIndex(0);
    }
    const currentSlide = () => slideIndex() >= 0 && slideIndex() < length ? slides[slideIndex()] : null;
    const selectPrev = () => {
        if (slideIndex() > 0) {
            setSlideIndex(slideIndex() - 1);
        }
    };
    const selectNext = () => {
        if (slideIndex() < length - 1) {
            setSlideIndex(slideIndex() + 1);
        }
    };
    const close = () => {
        solidLocal.onClose?.();
    };
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
          <div class={styles.root}>
            {currentSlide()}

            <LinkButton className={styles.close} onClick={close}>
              <Icon shape={mdiClose}/>
            </LinkButton>

            <div class={styles.footer}>
              <Meter length={slides.length} slideIndex={slideIndex()}/>

              {slideIndex() > 0 && (<LinkButton className={styles.prev} onClick={selectPrev}>
                  {formatMessage({
                id: "t_Previous",
                defaultMessage: "Previous",
            })}
                </LinkButton>)}

              {(slideIndex() < slides.length - 1 && (<LinkButton className={styles.next} onClick={selectNext}>
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
