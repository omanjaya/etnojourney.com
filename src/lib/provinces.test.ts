import { describe, expect, it } from "vitest";
import { PROVINCE_COUNT, provinceLabel } from "./provinces";

describe("provinceLabel", () => {
  it("covers all 38 provinces", () => {
    expect(PROVINCE_COUNT).toBe(38);
  });

  it("translates to official English names", () => {
    expect(provinceLabel("Sulawesi Selatan", "en")).toBe("South Sulawesi");
    expect(provinceLabel("DI Yogyakarta", "en")).toBe("Special Region of Yogyakarta");
    expect(provinceLabel("Papua Pegunungan", "en")).toBe("Highland Papua");
    expect(provinceLabel("Nusa Tenggara Timur", "en")).toBe("East Nusa Tenggara");
    expect(provinceLabel("  jawa   timur ", "en")).toBe("East Java");
  });

  it("keeps Indonesian names and unknown values as they are", () => {
    expect(provinceLabel("Sulawesi Selatan", "id")).toBe("Sulawesi Selatan");
    expect(provinceLabel("Atlantis", "en")).toBe("Atlantis");
  });
});
