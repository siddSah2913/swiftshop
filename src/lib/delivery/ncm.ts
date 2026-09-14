import { buildManifest } from "./shared";
import type { DeliveryAdapter } from "./types";

/** Nepal Can Move — the most promising courier for a real API later (2026-09). */
export const ncmAdapter: DeliveryAdapter = {
  id: "ncm",
  label: "Nepal Can Move",
  isApiConnected: false,
  generateManifest: (ctx) => buildManifest(ctx, ncmAdapter.label),
};