import { z } from "zod";
import { PROVINCES, type ProvinceId } from "@/lib/nepal";

const CATEGORIES = ["clothing", "electronics", "general"] as const;
const PROVINCE_IDS = PROVINCES.map((p) => p.id) as [ProvinceId, ...ProvinceId[]];

// province -> its districts, so "district not in that province" is a
// first-class error. The two-step picker can be bypassed by a direct POST —
// this closes that gap server-side (see Global Constraints).
const DISTRICT_BY_PROVINCE = new Map(PROVINCES.map((p) => [p.id, new Set(p.districts)]));

export const onboardingSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    category: z.enum(CATEGORIES),
    province: z.enum(PROVINCE_IDS),
    district: z.string().trim().min(1),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "onboarding.slugInvalid")
      .max(48),
  })
  .superRefine((data, ctx) => {
    // district must belong to the chosen province (cross-field — object-level
    // refine; Zod 4 removed ctx.parent). path: ["district"] so a bypassed
    // two-step picker surfaces the error on the district field.
    if (!DISTRICT_BY_PROVINCE.get(data.province)?.has(data.district)) {
      ctx.addIssue({
        code: "custom",
        path: ["district"],
        message: "common.error",
      });
    }
  });