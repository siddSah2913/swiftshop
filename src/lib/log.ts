// Tiny standard logger. WHY: keeps a single, uniform logging convention so
// errors are greppable and stack traces never leak to the browser.
//
// Usage (follow in every server action / API route, per webplan.md §5.6):
//   catch (e) { log("orders:confirm", e); return { ok: false, error: "…" } }

export function log(tag: string, message: unknown): void {
  const ts = new Date().toISOString();
  if (message instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(`[${ts}] [${tag}]`, message.stack ?? message.message);
  } else {
    // eslint-disable-next-line no-console
    console.error(`[${ts}] [${tag}]`, message);
  }
}