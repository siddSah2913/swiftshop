import { describe, expect, it, vi } from "vitest";
import { isMobileShareTarget } from "./mobile-share";

function stubUserAgent(ua: string, mobile?: boolean) {
  vi.stubGlobal("navigator", {
    userAgent: ua,
    userAgentData: mobile === undefined ? undefined : { mobile },
  } as unknown as Navigator);
}

describe("isMobileShareTarget", () => {
  it("returns false when navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isMobileShareTarget()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("detects Android user agents", () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36");
    expect(isMobileShareTarget()).toBe(true);
  });

  it("detects iPhone user agents", () => {
    stubUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(isMobileShareTarget()).toBe(true);
  });

  it("keeps desktop user agents on the modal", () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(isMobileShareTarget()).toBe(false);
  });

  it("trusts userAgentData.mobile when present", () => {
    stubUserAgent("", true);
    expect(isMobileShareTarget()).toBe(true);
    stubUserAgent("", false);
    expect(isMobileShareTarget()).toBe(false);
  });
});