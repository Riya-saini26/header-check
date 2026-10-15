import { describe, expect, it } from "vitest";
import { analyzeHtml, SAMPLE_HTML } from "@/lib/heading-engine";

describe("heading engine", () => {
  it("detects the sample's intentional issues", () => {
    const r = analyzeHtml(SAMPLE_HTML, "x", "html");
    expect(r.headings.length).toBe(7);
    expect(r.counts["missing-h1"]).toBe(1);
    expect(r.counts["skipped-level"]).toBe(1);
    expect(r.counts["duplicate-heading"]).toBe(1);
    expect(r.counts["empty-heading"]).toBe(1);
    expect(r.counts["generic-heading"]).toBe(1);
    expect(r.counts["long-heading"]).toBe(1);
    expect(r.score).toBeLessThan(50);
  });
  it("scores a clean page 100", () => {
    const r = analyzeHtml("<h1>Acme web studio</h1><h2>Our services</h2><h3>Web development</h3><h2>Contact us</h2>", "x", "html");
    expect(r.issues).toEqual([]);
    expect(r.score).toBe(100);
  });
});
