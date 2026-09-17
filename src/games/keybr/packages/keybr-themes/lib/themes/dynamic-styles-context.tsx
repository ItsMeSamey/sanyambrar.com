import { createContext, useContext } from 'solid-js';
const DynamicStylesContext = createContext({
    getStyledElement: (): HTMLElement => document.body,
});
export const useDynamicStyles = () => {
    return useContext(DynamicStylesContext);
};
