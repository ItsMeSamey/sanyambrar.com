import { type IntlShape, useIntl } from "./runtime.tsx";
import { intlMemo } from "./memo.ts";
const factory = ({ locale }: IntlShape): Intl.Collator => {
    return new Intl.Collator(locale);
};
const makeIntlCollator = intlMemo(factory);
export const useCollator = (): Intl.Collator => {
    return makeIntlCollator(useIntl());
};
