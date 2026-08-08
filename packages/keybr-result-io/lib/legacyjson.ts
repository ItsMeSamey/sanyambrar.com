import { Layout } from "@keybr/keyboard";
import { isPlainObject, isString } from "@keybr/lang";
import { Result, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";

export type ResultJson = {
  readonly l: string;
  readonly m: string;
  readonly ts: number;
  readonly n: number;
  readonly t: number;
  readonly e: number;
  readonly h: HistogramtJson;
};

export type HistogramtJson = {
  readonly [codePoint: number]: {
    readonly h: number;
    readonly m: number;
    readonly t: number;
  };
};

export function resultToJson(result: Result): ResultJson {
  return {
    l: result.layout.id,
    m: result.textType.id,
    ts: result.timeStamp,
    n: result.length,
    t: result.time,
    e: result.errors,
    h: histogramToJson(result.histogram),
  };
}

export function histogramToJson(histogram: Histogram): HistogramtJson {
  const json: {
    [codePoint: number]: {
      h: number;
      m: number;
      t: number;
    };
  } = {};
  for (const { codePoint, hitCount, missCount, timeToType } of histogram) {
    json[codePoint] = {
      h: hitCount,
      m: missCount,
      t: timeToType,
    };
  }
  return json;
}

export function resultFromJson(json: unknown): Result | null {
  if (!isPlainObject(json)) {
    return null;
  }
  const data = json as Record<string, unknown>;
  if ("l" in data || "m" in data || "ts" in data || "h" in data) {
    return resultFromCompactJson(data);
  }
  return resultFromExportJson(data);
}

function resultFromCompactJson(json: Record<string, unknown>): Result | null {
  const {
    l: layoutId,
    m: textTypeId,
    ts: timeStamp,
    n: length,
    t: time,
    e: errors,
    h: histogramJson,
  } = json;
  if (
    !(
      isString(layoutId) &&
      isString(textTypeId) &&
      Number.isSafeInteger(timeStamp) &&
      Number.isSafeInteger(length) &&
      Number.isSafeInteger(time) &&
      Number.isSafeInteger(errors)
    )
  ) {
    return null;
  }
  const histogram = histogramFromJson(histogramJson as HistogramtJson);
  return makeResult(
    layoutId,
    textTypeId,
    timeStamp as number,
    length as number,
    time as number,
    errors as number,
    histogram,
  );
}

function resultFromExportJson(json: Record<string, unknown>): Result | null {
  const { layout, textType, timeStamp, length, time, errors, histogram } = json;
  if (
    !(
      isString(layout) &&
      isString(textType) &&
      Number.isSafeInteger(length) &&
      Number.isSafeInteger(time) &&
      Number.isSafeInteger(errors)
    )
  ) {
    return null;
  }
  const parsedTimeStamp = parseTimeStamp(timeStamp);
  if (parsedTimeStamp == null) {
    return null;
  }
  return makeResult(
    layout,
    textType,
    parsedTimeStamp,
    length as number,
    time as number,
    errors as number,
    histogramFromExportJson(histogram),
  );
}

function makeResult(
  layoutId: string,
  textTypeId: string,
  timeStamp: number,
  length: number,
  time: number,
  errors: number,
  histogram: Histogram | null,
): Result | null {
  if (histogram == null) {
    return null;
  }
  try {
    return new Result(
      Layout.ALL.get(fixLegacyLayoutId(layoutId)),
      TextType.ALL.get(fixTextTypeId(textTypeId)),
      timeStamp,
      length,
      time,
      errors,
      histogram,
    );
  } catch {
    return null;
  }
}

function parseTimeStamp(value: unknown): number | null {
  if (Number.isSafeInteger(value)) {
    return value as number;
  }
  if (isString(value)) {
    const timeStamp = Date.parse(value);
    if (Number.isSafeInteger(timeStamp)) {
      return timeStamp;
    }
  }
  return null;
}

function histogramFromExportJson(json: unknown): Histogram | null {
  if (!Array.isArray(json)) {
    return null;
  }
  const samples = [];
  for (const value of json) {
    if (!isPlainObject(value)) {
      return null;
    }
    const { codePoint, hitCount, missCount, timeToType } = value as Record<
      string,
      unknown
    >;
    if (
      !(
        Number.isSafeInteger(codePoint) &&
        (codePoint as number) > 0 &&
        (codePoint as number) <= 65535 &&
        Number.isSafeInteger(hitCount) &&
        Number.isSafeInteger(missCount) &&
        typeof timeToType === "number" &&
        Number.isFinite(timeToType)
      )
    ) {
      return null;
    }
    samples.push({
      codePoint: codePoint as number,
      hitCount: hitCount as number,
      missCount: missCount as number,
      timeToType: Math.round(timeToType),
    });
  }
  return new Histogram(samples);
}

export function histogramFromJson(json: HistogramtJson): Histogram | null {
  if (!isPlainObject(json)) {
    return null;
  }
  const samples = [];
  for (const [key, sample] of Object.entries(json)) {
    const codePoint = Number(key);
    if (
      !(Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 65535)
    ) {
      return null;
    }
    if (!isPlainObject(sample)) {
      return null;
    }
    const {
      h: hitCount,
      m: missCount,
      t: timeToType,
    } = sample as {
      readonly h: number;
      readonly m: number;
      readonly t: number;
    };
    if (
      !(
        Number.isSafeInteger(hitCount) &&
        Number.isSafeInteger(missCount) &&
        Number.isFinite(timeToType)
      )
    ) {
      return null;
    }
    samples.push({
      codePoint,
      hitCount,
      missCount,
      timeToType: Math.round(timeToType),
    });
  }
  return new Histogram(samples);
}

function fixLegacyLayoutId(id: string): string {
  // Fix layout identifiers that were changed in cfafe818d5edd3d72a738183730dae049b967ebc
  switch (id) {
    case "be":
      return Layout.BE_BY.id;
    case "cz":
      return Layout.CS_CZ.id;
    case "de":
      return Layout.DE_DE.id;
    case "fr":
      return Layout.FR_FR.id;
    case "it":
      return Layout.IT_IT.id;
    case "pl":
      return Layout.PL_PL.id;
    case "ru":
      return Layout.RU_RU.id;
    case "se":
      return Layout.SV_SE.id;
    case "ua":
      return Layout.UK_UA.id;
    case "uk":
      return Layout.EN_UK.id;
    case "us":
      return Layout.EN_US.id;
    case "us-canary-matrix":
      return Layout.EN_CANARY_MATRIX.id;
    case "us-colemak":
      return Layout.EN_COLEMAK.id;
    case "us-colemak-dh":
      return Layout.EN_COLEMAK_DH_ANSI.id;
    case "us-colemak-dh-matrix":
      return Layout.EN_COLEMAK_DH_MATRIX.id;
    case "us-dvorak":
      return Layout.EN_DVORAK.id;
    case "us-workman":
      return Layout.EN_WORKMAN.id;
    default:
      return id;
  }
}

function fixTextTypeId(id: string): string {
  switch (id) {
    case "guided":
      return TextType.GENERATED.id;
    case "custom":
      return TextType.NATURAL.id;
    default:
      return id;
  }
}
