/** Tiny haptic tick where supported (Android Chrome); a no-op elsewhere. */
export function buzz(ms = 10) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    /* unsupported */
  }
}
