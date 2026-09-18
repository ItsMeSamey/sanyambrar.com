import "./style.css";
import { renderFatalError } from "../../shared/error.ts";
import { main } from "./App.tsx";

globalThis.SameyMountKeybr = main;

try {
  main();
} catch (error) {
  renderFatalError(document.getElementById("app") ?? document.body, "Keybr failed to start", error);
  throw error;
}
