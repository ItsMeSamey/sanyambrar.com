import "./style.css";
import { renderFatalError } from "../../shared/error.ts";
import { onSharedRuntimeReady } from "../../shared/runtimeReady.ts";
import { afterVisualTransition } from "../../shared/afterVisualTransition.ts";
import { main } from "./App.tsx";

globalThis.SameyMountKeybr = main;

onSharedRuntimeReady(() => {
  afterVisualTransition(() => {
    try {
      main();
    } catch (error) {
      renderFatalError(document.getElementById("app") ?? document.body, "Keybr failed to start", error);
      throw error;
    }
  });
});
