import { describe, expect, it } from "vitest";
import {
  currentProgramPhase,
  defaultProgramPhases,
  normalizeProgramPhases,
} from "@/lib/members/program-phases";

describe("program phases", () => {
  it("creates default phases from program dates", () => {
    const phases = defaultProgramPhases("2026-01-01", "2026-03-31");
    expect(phases).toHaveLength(3);
    expect(phases[0].label).toBe("Metabolic reset");
  });

  it("picks current phase by date", () => {
    const phases = normalizeProgramPhases([], "2026-01-01", "2026-12-31");
    const current = currentProgramPhase(phases, "2026-06-15");
    expect(current?.label).toBeTruthy();
  });
});
