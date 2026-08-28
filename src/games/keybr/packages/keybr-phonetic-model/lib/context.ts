import { createContext, useContext } from "@keybr/solid-compat/react";
import { type PhoneticModel } from "./phoneticmodel.ts";
export const PhoneticModelContext = createContext<PhoneticModel>(null!);
