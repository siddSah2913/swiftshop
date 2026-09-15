// Decides whether the native OS share sheet should be used. The user wants
// native share on touch devices but the YouTube-style modal on desktop — so
// gate on the device, not on navigator.share presence (macOS Safari and desktop
// Chrome also expose navigator.share).

export function isMobileShareTarget(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  return (
    (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData
      ?.mobile ??
    /ANDROID|IPHONE|IPAD|IPOD|MOBI/i.test(ua)
  );
}