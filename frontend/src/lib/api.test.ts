import { describe, expect, it } from "vitest";
import { fallbackDocuments, fallbackResponse, fallbackSpaces } from "../data/fallback";

describe("fallback data", () => {
  it("contains a useful default space with documents and grounding response", () => {
    expect(fallbackSpaces[0].documentIds).toHaveLength(fallbackDocuments.length);
    expect(fallbackResponse.sources[0].excerpts[0]).toContain("answer, sources");
    expect(fallbackResponse.toolTrace[0].name).toBe("classify_intent");
    expect(fallbackResponse.riskFlags[0]).toContain("allowlist");
  });
});
