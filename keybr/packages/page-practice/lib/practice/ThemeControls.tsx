import {
  COLORS,
  DARK_CUSTOM_THEME,
  FONTS,
  LIGHT_CUSTOM_THEME,
  type CustomThemeColorName,
  type CustomThemeColors,
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

const customFields: readonly {
  readonly name: CustomThemeColorName;
  readonly label: string;
}[] = [
  { name: "background", label: "Background" },
  { name: "text", label: "Text" },
  { name: "accent", label: "Accent" },
  { name: "error", label: "Errors" },
  { name: "slow", label: "Slow keys" },
  { name: "fast", label: "Fast keys" },
  { name: "effort", label: "Effort" },
];

export function ThemeControls() {
  const { formatMessage } = useIntl();
  const {
    color,
    font,
    custom,
    switchColor,
    switchFont,
    setCustomColor,
    setCustomTheme,
  } = useTheme();
  const [open, setOpen] = useState<"color" | "custom" | "font" | null>(null);
  return (
    <div className={styles.root}>
      <Popover
        open={open === "color" || open === "custom"}
        anchor={
          <IconButton
            icon={<Icon shape={mdiThemeLightDark} />}
            title={formatMessage({
              id: "local.theme.color.description",
              defaultMessage: "Change the color theme.",
            })}
            onClick={() => setOpen(open == null ? "color" : null)}
          />
        }
        offset={10}
      >
        {open === "custom" ? (
          <CustomThemeEditor
            custom={custom}
            onChange={setCustomColor}
            onReset={setCustomTheme}
            onBack={() => setOpen("color")}
            onDone={() => setOpen(null)}
          />
        ) : (
          <ThemeMenu
            options={COLORS}
            selectedId={color}
            onSelect={(id) => {
              if (id === "custom") {
                switchColor("custom");
                setOpen("custom");
              } else {
                switchColor(id as ThemeColor);
                setOpen(null);
              }
            }}
          />
        )}
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

function CustomThemeEditor({
  custom,
  onChange,
  onReset,
  onBack,
  onDone,
}: {
  readonly custom: CustomThemeColors;
  readonly onChange: (name: CustomThemeColorName, value: string) => void;
  readonly onReset: (theme: CustomThemeColors) => void;
  readonly onBack: () => void;
  readonly onDone: () => void;
}) {
  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <strong>Custom theme</strong>
        <button type="button" className={styles.textButton} onClick={onBack}>
          Presets
        </button>
      </div>
      <div className={styles.editorBody}>
        {customFields.map(({ name, label }) => (
          <label key={name} className={styles.colorField}>
            <span>{label}</span>
            <span className={styles.colorValue}>{custom[name]}</span>
            <input
              className={styles.colorInput}
              type="color"
              value={custom[name]}
              onChange={(event) => onChange(name, event.currentTarget.value)}
            />
          </label>
        ))}
      </div>
      <div className={styles.editorActions}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => onReset(LIGHT_CUSTOM_THEME)}
        >
          Light base
        </button>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => onReset(DARK_CUSTOM_THEME)}
        >
          Dark base
        </button>
        <button type="button" className={styles.doneButton} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
