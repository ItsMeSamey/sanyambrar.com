/*
 * Locale identifier is a triple "language[-script][-region]".
 *
 * Examples are:
 *
 * - "en" -- English.
 * - "en-US" -- English, United States.
 * - "en-CA" -- English, Canada.
 * - "zh-Hans" Chinese, Simplified Script.
 * - "zh-Hant" Chinese, Traditional Script.
 * - "zh-CN" Chinese, China.
 * - "zh-TW" Chinese, Taiwan.
 * - "zh-Hans-CN" Chinese, Simplified Script, China.
 * - "zh-Hant-TW" Chinese, Traditional Script, Taiwan.
 *
 * @see https://www.w3.org/International/articles/bcp47/
 * @see https://www.rfc-editor.org/rfc/rfc5646.txt
 */
export type LocaleId = string;
export const defaultLocale: LocaleId = "en";
export const allLocales: readonly LocaleId[] = [
    defaultLocale,
    "af",
    "ar",
    "bg",
    "ca",
    "cs",
    "da",
    "de",
    "el",
    "eo",
    "es",
    "et",
    "fa",
    "fi",
    "fr",
    "ga",
    "he",
    "hr",
    "hu",
    "id",
    "it",
    "ja",
    "ko",
    "ne",
    "nl",
    "pl",
    "pt-br",
    "pt-pt",
    "ro",
    "ru",
    "sk",
    "sv",
    "th",
    "tr",
    "uk",
    "vi",
    "zh-hans",
    "zh-hant",
    "zh-tw",
];
export function getDir(locale: LocaleId): "ltr" | "rtl" {
    switch (locale) {
        case "ar":
        case "fa":
        case "he":
            return "rtl";
        default:
            return "ltr";
    }
}
