import { createContext, useContext, type JSX } from "solid-js";

export type MessageDescriptor = { id?: string; defaultMessage?: string; description?: string };
export type FormatNumberOptions = Intl.NumberFormatOptions;
export type IntlShape = ReturnType<typeof makeIntl>;
type RichTextHandler = (...chunks: JSX.Element[]) => JSX.Element;
type MessageValues = Record<string, unknown>;

function formatTemplate(
  template: string,
  values: MessageValues | undefined,
  richTextElements: Record<string, RichTextHandler>,
  locale: string,
): JSX.Element {
  const inputValues = values ?? {};

  const parse = (source: string): JSX.Element[] => {
    const output: JSX.Element[] = [];
    let text = "";
    let index = 0;

    const flushText = () => {
      if (text.length > 0) {
        output.push(text);
        text = "";
      }
    };

    while (index < source.length) {
      if (source[index] === "<") {
        const open = /^<([A-Za-z][\w-]*)>/.exec(source.slice(index));
        const selfClosing = /^<([A-Za-z][\w-]*)\s*\/>/.exec(source.slice(index));
        if (selfClosing != null) {
          flushText();
          const handler = handlerFor(selfClosing[1]);
          output.push(handler ? handler() : selfClosing[0]);
          index += selfClosing[0].length;
          continue;
        }
        if (open != null) {
          const tag = open[1];
          const close = `</${tag}>`;
          const end = findMatchingTag(source, index + open[0].length, tag);
          if (end >= 0) {
            flushText();
            const innerStart = index + open[0].length;
            const inner = parse(source.slice(innerStart, end));
            const handler = handlerFor(tag);
            if (handler != null) output.push(handler(...inner));
            else output.push(open[0], ...inner, close);
            index = end + close.length;
            continue;
          }
        }
      }

      if (source[index] === "{") {
        const end = findMatchingBrace(source, index);
        if (end >= 0) {
          flushText();
          output.push(formatArgument(source.slice(index + 1, end)));
          index = end + 1;
          continue;
        }
      }

      text += source[index++];
    }

    flushText();
    return output;
  };

  const handlerFor = (tag: string): RichTextHandler | undefined => {
    const supplied = inputValues[tag];
    return typeof supplied === "function" ? supplied as RichTextHandler : richTextElements[tag];
  };

  const formatArgument = (content: string): JSX.Element => {
    const comma = findTopLevelComma(content);
    if (comma < 0) {
      const value = inputValues[content.trim()];
      return value == null ? "" : value as JSX.Element;
    }

    const name = content.slice(0, comma).trim();
    const remainder = content.slice(comma + 1).trim();
    const secondComma = findTopLevelComma(remainder);
    if (secondComma < 0) {
      const value = inputValues[name];
      return value == null ? "" : value as JSX.Element;
    }

    const kind = remainder.slice(0, secondComma).trim();
    const options = remainder.slice(secondComma + 1).trim();
    if (kind === "plural" || kind === "selectordinal") {
      const raw = Number(inputValues[name] ?? 0);
      const choices = parseChoices(options);
      const exact = choices.get(`=${raw}`);
      const category = new Intl.PluralRules(locale, {
        type: kind === "selectordinal" ? "ordinal" : "cardinal",
      }).select(raw);
      const selected = exact ?? choices.get(category) ?? choices.get("other") ?? "";
      return parse(selected.replaceAll("#", new Intl.NumberFormat(locale).format(raw)));
    }
    if (kind === "select") {
      const key = String(inputValues[name] ?? "other");
      const choices = parseChoices(options);
      return parse(choices.get(key) ?? choices.get("other") ?? "");
    }
    if (kind === "number") {
      return new Intl.NumberFormat(locale).format(Number(inputValues[name] ?? 0));
    }

    const value = inputValues[name];
    return value == null ? "" : value as JSX.Element;
  };

  return collapseText(parse(template));
}

function collapseText(value: JSX.Element): JSX.Element {
  if (Array.isArray(value)) {
    const collapsed = value.map(collapseText);
    if (collapsed.every((item) => typeof item === "string" || typeof item === "number")) {
      return collapsed.join("");
    }
    return collapsed;
  }
  return value;
}

function findMatchingBrace(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findTopLevelComma(source: string): number {
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    else if (source[i] === "," && depth === 0) return i;
  }
  return -1;
}

function parseChoices(source: string): Map<string, string> {
  const result = new Map<string, string>();
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] ?? "")) index++;
    const keyStart = index;
    while (index < source.length && !/\s|\{/.test(source[index])) index++;
    const key = source.slice(keyStart, index);
    while (/\s/.test(source[index] ?? "")) index++;
    if (source[index] !== "{") break;
    const end = findMatchingBrace(source, index);
    if (end < 0) break;
    result.set(key, source.slice(index + 1, end));
    index = end + 1;
  }
  return result;
}

function findMatchingTag(source: string, contentStart: number, tag: string): number {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  let depth = 1;
  let index = contentStart;
  while (index < source.length) {
    const nextOpen = source.indexOf(open, index);
    const nextClose = source.indexOf(close, index);
    if (nextClose < 0) return -1;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      index = nextOpen + open.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      index = nextClose + close.length;
    }
  }
  return -1;
}

function makeIntl(
  locale = navigator.language || "en",
  messages: Record<string, string> = {},
  richTextElements: Record<string, RichTextHandler> = {},
) {
  const displayNamesCache = new Map<string, Intl.DisplayNames>();
  return {
    locale,
    messages,
    formatters: {
      getDisplayNames(locales: string | string[], options: Intl.DisplayNamesOptions) {
        const key = JSON.stringify([locales, options]);
        let value = displayNamesCache.get(key);
        if (value == null) {
          value = new Intl.DisplayNames(locales, options);
          displayNamesCache.set(key, value);
        }
        return value;
      },
    },
    formatMessage(descriptor: MessageDescriptor, values?: MessageValues): any {
      const template = messages[descriptor.id ?? ""] ?? descriptor.defaultMessage ?? descriptor.id ?? "";
      return formatTemplate(template, values, richTextElements, locale);
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
export function FormattedMessage(props: MessageDescriptor & { values?: MessageValues }): JSX.Element {
  return useIntl().formatMessage(props, props.values);
}
export function RawIntlProvider(props: { value: IntlShape; children?: JSX.Element }): JSX.Element {
  return <IntlContext.Provider value={props.value}>{props.children}</IntlContext.Provider>;
}
export const IntlProvider = RawIntlProvider;

export function createIntlCache(): Record<string, never> { return {}; }
export function createIntl(config: any, _cache?: unknown): IntlShape {
  return makeIntl(
    config?.locale ?? "en",
    config?.messages ?? {},
    config?.defaultRichTextElements ?? {},
  );
}
