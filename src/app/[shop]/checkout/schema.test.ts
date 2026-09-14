import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./schema";

const valid = {
  name: "Sita Sharma",
  phone: "9800000000",
  address: "Kathmandu 28, Ward 12",
  paymentType: "cod",
} as const;

describe("checkoutSchema", () => {
  it("accepts a valid COD checkout", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a valid QR checkout", () => {
    expect(
      checkoutSchema.safeParse({ ...valid, paymentType: "qr" }).success
    ).toBe(true);
  });

  it("trims whitespace and accepts padded input", () => {
    const padded = { ...valid, name: "  Sita Sharma  ", phone: " 9800000000 " };
    const result = checkoutSchema.safeParse(padded);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sita Sharma");
      expect(result.data.phone).toBe("9800000000");
    }
  });

  it("rejects an empty name", () => {
    const result = checkoutSchema.safeParse({ ...valid, name: " " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("checkout.invalidName");
    }
  });

  it("rejects a name longer than 80 chars", () => {
    const result = checkoutSchema.safeParse({
      ...valid,
      name: "a".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a bad phone (too short)", () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: "123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("checkout.invalidPhone");
    }
  });

  it("rejects a bad phone (8 digits)", () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: "9800" });
    expect(result.success).toBe(false);
  });

  it("rejects a landline phone (2 starts)", () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: "210000000" });
    expect(result.success).toBe(false);
  });

  it("rejects a +977-prefixed phone", () => {
    const result = checkoutSchema.safeParse({
      ...valid,
      phone: "+9779800000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty address", () => {
    const result = checkoutSchema.safeParse({ ...valid, address: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("checkout.invalidAddress");
    }
  });

  it("rejects an address longer than 200 chars", () => {
    const result = checkoutSchema.safeParse({
      ...valid,
      address: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty payment type with the i18n key", () => {
    const result = checkoutSchema.safeParse({ ...valid, paymentType: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("checkout.invalidPayment");
    }
  });

  it("rejects an unknown payment type", () => {
    const result = checkoutSchema.safeParse({
      ...valid,
      paymentType: "card",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("checkout.invalidPayment");
    }
  });
});