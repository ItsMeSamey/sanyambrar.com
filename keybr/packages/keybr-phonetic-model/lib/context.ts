import { createContext, useContext } from "react";
import { type PhoneticModel } from "./phoneticmodel.ts";

export const PhoneticModelContext = createContext<PhoneticModel>(null!);
