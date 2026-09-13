import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  imageExt,
  uploadUrl,
  validateImageFile,
} from "./files";

function file(size: number, type: string): File {
  return new File([new Uint8Array(size)], "a", { type });
}

describe("imageExt", () => {
  it("maps accepted mime types to extensions", () => {
    expect(imageExt("image/jpeg")).toBe("jpg");
    expect(imageExt("image/png")).toBe("png");
    expect(imageExt("image/webp")).toBe("webp");
  });
  it("rejects anything else", () => {
    expect(imageExt("image/gif")).toBeNull();
    expect(imageExt("")).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("accepts a valid jpeg under the cap", () => {
    expect(validateImageFile(file(1024, "image/jpeg"))).toBeNull();
  });
  it("rejects wrong types", () => {
    expect(validateImageFile(file(1024, "image/gif"))).toBe("products.invalidImage");
  });
  it("rejects > 5MB", () => {
    expect(validateImageFile(file(MAX_FILE_BYTES + 1, "image/jpeg"))).toBe(
      "products.imageTooBig",
    );
  });
  it("rejects empty files", () => {
    expect(validateImageFile(file(0, "image/png"))).toBe("products.invalidImage");
  });
});

describe("uploadUrl", () => {
  it("builds the public path under the store folder", () => {
    expect(uploadUrl("abc", "logo-123.jpg")).toBe("/uploads-original/abc/logo-123.jpg");
  });
});
