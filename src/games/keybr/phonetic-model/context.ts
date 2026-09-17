import { createContext } from 'solid-js';
import { type PhoneticModel } from "./phoneticmodel.ts";
export const PhoneticModelContext = createContext<PhoneticModel>(null!);
