import { createContext, useContext, type JSX } from "solid-js";

export type MessageDescriptor = { id?: string; defaultMessage?: string; description?: string };
export type FormatNumberOptions = Intl.NumberFormatOptions;
export type IntlShape = ReturnType<typeof makeIntl>;

function formatTemplate(template: string, values?: Record<string, unknown>): JSX.Element {
  if (!values) return template;
  const parts: JSX.Element[] = [];
  let cursor = 0;
  const pattern = /\{([\w.-]+)(?:,[^}]*)?\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(template))) {
    if (match.index > cursor) parts.push(template.slice(cursor, match.index));
    const value = values[match[1]];
    parts.push(typeof value === "function" ? (value as (chunks: JSX.Element) => JSX.Element)(match[0]) : (value as JSX.Element) ?? "");
    cursor = match.index + match[0].length;
  }
  if (cursor < template.length) parts.push(template.slice(cursor));
  return parts;
}

function makeIntl(locale = navigator.language || "en") {
  const displayNamesCache = new Map<string, Intl.DisplayNames>();
  return {
    locale,
    messages: {} as Record<string, string>,
    formatters: {
      getDisplayNames(locales: string | string[], options: Intl.DisplayNamesOptions) {
        const key = JSON.stringify([locales, options]);
        let value = displayNamesCache.get(key);
        if (value == null) { value = new Intl.DisplayNames(locales, options); displayNamesCache.set(key, value); }
        return value;
      },
    },
    formatMessage(descriptor: MessageDescriptor, values?: Record<string, unknown>): any {
      return formatTemplate(descriptor.defaultMessage ?? descriptor.id ?? "", values);
    },
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
      return new Intl.DateTimeFormat(locale, options).format(value);
    },
    formatList(values: Iterable<string>, options?: Intl.ListFormatOptions): string {
      return new Intl.ListFormat(locale, options).format([...values]);
    },
  };
}

const IntlContext = createContext<IntlShape>(makeIntl());
export function useIntl(): IntlShape { return useContext(IntlContext); }
export function defineMessage<T extends MessageDescriptor>(descriptor: T): T { return descriptor; }
export function FormattedMessage(props: MessageDescriptor & { values?: Record<string, unknown> }): JSX.Element {
  return useIntl().formatMessage(props, props.values);
}
export function RawIntlProvider(props: { value: IntlShape; children?: JSX.Element }): JSX.Element {
  return <IntlContext.Provider value={props.value}>{props.children}</IntlContext.Provider>;
}
export const IntlProvider = RawIntlProvider;

export function createIntlCache(): Record<string, never> { return {}; }
export function createIntl(config: any, _cache?: unknown): IntlShape {
  const value = makeIntl(config?.locale ?? "en");
  value.messages = config?.messages ?? {};
  const original = value.formatMessage.bind(value);
  value.formatMessage = (descriptor: MessageDescriptor, values?: Record<string, unknown>) => {
    const template = value.messages[descriptor.id ?? ""] ?? descriptor.defaultMessage ?? descriptor.id ?? "";
    return formatTemplate(template, values);
  };
  return value;
}
