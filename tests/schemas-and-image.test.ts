import { describe, expect, it } from "vitest";
import type { z } from "zod";
import * as fb from "@/lib/scan/gemini-schemas";
import { assessQuality, laplacianVariance } from "@/lib/scan/image";
import { CompareSchema, CurationSchema, DescriptionSchema, GarmentAnalysisSchema, ShotReviewSchema, StorySchema } from "@/lib/scan/schemas";

/** Firebase Schema 와 zod 스키마의 필드 이름이 같은지 재귀 비교 */
function fbKeys(s: Record<string, unknown>): unknown {
  if (s.type === "object" && s.properties) {
    const props = s.properties as Record<string, Record<string, unknown>>;
    return Object.fromEntries(Object.keys(props).sort().map((k) => [k, fbKeys(props[k])]));
  }
  if (s.type === "array" && s.items) return [fbKeys(s.items as Record<string, unknown>)];
  return "leaf";
}
function zodKeys(s: z.ZodType): unknown {
  const def = (s as unknown as { def: { type: string; shape?: Record<string, z.ZodType>; element?: z.ZodType; innerType?: z.ZodType } }).def;
  if (def.type === "nullable" || def.type === "optional" || def.type === "default") return zodKeys(def.innerType as z.ZodType);
  if (def.type === "object") return Object.fromEntries(Object.keys(def.shape!).sort().map((k) => [k, zodKeys(def.shape![k])]));
  if (def.type === "array") return [zodKeys(def.element!)];
  return "leaf";
}

describe("Gemini responseSchema ↔ zod 검증 스키마 일치", () => {
  it.each([
    ["shotReview", fb.shotReviewSchema, ShotReviewSchema],
    ["garmentAnalysis", fb.garmentAnalysisSchema, GarmentAnalysisSchema],
    ["compare", fb.compareSchema, CompareSchema],
    ["description", fb.descriptionSchema, DescriptionSchema],
    ["story", fb.storySchema, StorySchema],
    ["curation", fb.curationSchema, CurationSchema],
  ] as const)("%s", (_, a, b) => {
    expect(fbKeys(a as unknown as Record<string, unknown>)).toEqual(zodKeys(b));
  });
});

describe("흐림 판정", () => {
  it("평평한 이미지는 분산 0, 체커보드는 크다", () => {
    const w = 32;
    const flat = new Array(w * w).fill(128);
    const checker = Array.from({ length: w * w }, (_, i) => (((i % w) + Math.floor(i / w)) % 2 ? 255 : 0));
    expect(laplacianVariance(flat, w, w)).toBe(0);
    expect(laplacianVariance(checker, w, w)).toBeGreaterThan(1000);
  });
  it("RGBA 입력으로 흐림 · 어두움 표시", () => {
    const w = 16;
    const dark = new Uint8ClampedArray(w * w * 4).fill(10);
    const q = assessQuality(dark, w, w);
    expect(q.dark).toBe(true);
    expect(q.blurry).toBe(true);
  });
});
