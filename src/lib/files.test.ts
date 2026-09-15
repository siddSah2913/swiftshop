import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  extToMime,
  imageExt,
  uploadUrl,
  validateImageFile,
} from "./files";

function file(size: number, type: string, name = "a"): File {
  return new File([new Uint8Array(size)], name, { type });
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
  it("falls back to filename extension for non-canonical MIME types", () => {
    expect(imageExt("image/x-png", "photo.png")).toBe("png");
    expect(imageExt("image/x-png", "photo.PNG")).toBe("png");
    expect(imageExt("image/jpg", "scan.jpg")).toBe("jpg");
    expect(imageExt("image/jpg", "scan.jpeg")).toBe("jpg");
  });
  it("rejects unknown MIME with non-image extension", () => {
    expect(imageExt("image/x-png", "data.txt")).toBeNull();
    expect(imageExt("image/x-png", "file.pdf")).toBeNull();
  });
  it("rejects unknown MIME with no filename", () => {
    expect(imageExt("image/x-png")).toBeNull();
  });
});

describe("extToMime", () => {
  it("maps standard extensions to canonical MIME types", () => {
    expect(extToMime("jpg")).toBe("image/jpeg");
    expect(extToMime("jpeg")).toBe("image/jpeg");
    expect(extToMime("png")).toBe("image/png");
    expect(extToMime("webp")).toBe("image/webp");
  });
  it("returns null for unknown extensions", () => {
    expect(extToMime("gif")).toBeNull();
    expect(extToMime("bmp")).toBeNull();
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
  it("accepts image/x-png with .png filename (Windows MIME variant)", () => {
    expect(validateImageFile(file(1024, "image/x-png", "photo.png"))).toBeNull();
  });
  it("rejects non-canonical MIME with wrong extension", () => {
    expect(validateImageFile(file(1024, "image/x-png", "data.txt"))).toBe(
      "products.invalidImage",
    );
  });
});

describe("uploadUrl", () => {
  it("builds the public path under the store folder", () => {
    expect(uploadUrl("abc", "logo-123.jpg")).toBe("/uploads-original/abc/logo-123.jpg");
  });
});
