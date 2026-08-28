import { booleanProp, type Settings } from "@keybr/settings";

export const textInputProps = {
  stopOnError: booleanProp("textInput.stopOnError", true),
  forgiveErrors: booleanProp("textInput.forgiveErrors", true),
  spaceSkipsWords: booleanProp("textInput.spaceSkipsWords", false),
} as const;

export const toTextInputSettings = (settings: Settings) => ({
  stopOnError: settings.get(textInputProps.stopOnError),
  forgiveErrors: settings.get(textInputProps.forgiveErrors),
  spaceSkipsWords: settings.get(textInputProps.spaceSkipsWords),
});
