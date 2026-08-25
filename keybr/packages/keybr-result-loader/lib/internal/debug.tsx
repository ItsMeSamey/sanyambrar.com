import { ErrorAlert } from "@keybr/debug";

/** Report local IndexedDB failures without any server/retry assumptions. */
export function catchError(error: unknown) {
  console.error(error);
  ErrorAlert.toast(
    <>
      <p>Could not access local typing history.</p>
      <p>Check that this browser allows local site storage.</p>
    </>,
    error,
  );
}
