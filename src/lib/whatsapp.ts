// WhatsApp click-to-chat link helpers (wa.me).

/**
 * wa.me needs an international number. Nepali mobiles are stored as 10-digit
 * (98XXXXXXXX); prepend the +977 country code. Already-international or
 * non-Nepali numbers pass through unchanged.
 */
export function normalizeDevicePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("9")
    ? `977${digits}`
    : digits;
}

/** Build a wa.me click-to-chat URL with a URL-encoded pre-filled message. */
export function buildWaUrl(phone: string, text: string): string {
  return `https://wa.me/${normalizeDevicePhone(phone)}?text=${encodeURIComponent(text)}`;
}