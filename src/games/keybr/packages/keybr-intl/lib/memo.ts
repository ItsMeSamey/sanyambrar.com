import { type IntlShape } from "./runtime.tsx";
export const intlMemo = <T>(factory: (intl: IntlShape) => T) => {
    const cache = new WeakMap<IntlShape, T>();
    return (intl: IntlShape): T => {
        let value = cache.get(intl);
        if (value === undefined) cache.set(intl, value = factory(intl));
        return value;
    };
};
