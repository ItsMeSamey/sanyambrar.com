import { createIntl, createIntlCache, type IntlShape } from "@keybr/solid-compat/intl";
import messages from "./messages/en.json";
import { defaultRichTextElements } from "./markup.tsx";
let cached: IntlShape | null = null;
export async function loadIntl(): Promise<IntlShape> {
    return (cached ??= createIntl({
        locale: "en",
        defaultLocale: "en",
        defaultRichTextElements,
        messages,
        onWarn: () => { },
        onError: (error: Error & { code?: string }) => {
            if (error.code !== "MISSING_TRANSLATION") {
                console.error("Intl error", error);
            }
        },
    }, createIntlCache()));
}
