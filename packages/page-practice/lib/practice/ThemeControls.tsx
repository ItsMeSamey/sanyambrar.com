import {
  COLORS,
  FONTS,
  type ThemeColor,
  type ThemeFont,
  useTheme,
} from "@keybr/themes";
import { Icon, IconButton, Popover } from "@keybr/widget";
import { mdiFormatFont, mdiThemeLightDark } from "@mdi/js";
import { clsx } from "clsx";
import { useState } from "react";
import { useIntl } from "react-intl";
import * as styles from "./ThemeControls.module.less";

export function ThemeControls() {
  const { formatMessage } = useIntl();
  const { color, font, switchColor, switchFont } = useTheme();
  const [open, setOpen] = useState<"color" | "font" | null>(null);
  return (
    <div className={styles.root}>
      <Popover
        open={open === "color"}
        anchor={
          <IconButton
            icon={<Icon shape={mdiThemeLightDark} />}
            title={formatMessage({
              id: "local.theme.color.description",
              defaultMessage: "Change the color theme.",
            })}
            onClick={() => setOpen(open === "color" ? null : "color")}
          />
        }
        offset={10}
      >
        <ThemeMenu
          options={COLORS}
          selectedId={color}
          onSelect={(id) => {
            switchColor(id as ThemeColor);
            setOpen(null);
          }}
        />
      </Popover>
      <Popover
        open={open === "font"}
        anchor={
          <IconButton
            icon={<Icon shape={mdiFormatFont} />}
            title={formatMessage({
              id: "local.theme.font.description",
              defaultMessage: "Change the interface font.",
            })}
            onClick={() => setOpen(open === "font" ? null : "font")}
          />
        }
        offset={10}
      >
        <ThemeMenu
          options={FONTS}
          selectedId={font}
          onSelect={(id) => {
            switchFont(id as ThemeFont);
            setOpen(null);
          }}
        />
      </Popover>
    </div>
  );
}

function ThemeMenu({
  options,
  selectedId,
  onSelect,
}: {
  readonly options: readonly { readonly id: string; readonly name: string }[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
}) {
  return (
    <ul role="menu" className={styles.menu}>
      {options.map(({ id, name }) => (
        <li
          key={id}
          role="menuitem"
          className={clsx(styles.item, id === selectedId && styles.item_selected)}
          onClick={(event) => {
            event.preventDefault();
            onSelect(id);
          }}
        >
          {name}
        </li>
      ))}
    </ul>
  );
}
