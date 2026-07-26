import { describe, expect, it } from "vitest";
import {
  computeProgramWindows,
  resolveWindowIndex,
  windowBounds,
} from "@/lib/members/program-journey";

describe("computeProgramWindows", () => {
  it("splits a 9-month program into 3 windows", () => {
    const windows = computeProgramWindows("2026-01-01", "2026-10-01");
    expect(windows.length).toBeGreaterThanOrEqual(3);
    expect(windows[0].from).toBe("2026-01-01");
    expect(windows[0].index).toBe(0);
  });

  it("defaults to window containing today", () => {
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 6);
    const end = new Date(today);
    end.setMonth(end.getMonth() + 6);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const windows = computeProgramWindows(startStr, endStr, today);
    const idx = resolveWindowIndex(windows, undefined, today);
    const bounds = windowBounds(windows, idx);
    expect(bounds).not.toBeNull();
    const todayStr = today.toISOString().slice(0, 10);
    expect(todayStr >= bounds!.from && todayStr <= bounds!.to).toBe(true);
  });

  it("honours explicit windowIndex", () => {
    const windows = computeProgramWindows("2024-01-01", "2026-12-31");
    const bounds = windowBounds(windows, 1);
    expect(bounds?.index).toBe(1);
    expect(bounds?.from).toBe(windows[1].from);
    expect(bounds?.to).toBe(windows[1].to);
  });

  it("clamps out-of-range windowIndex", () => {
    const windows = computeProgramWindows("2026-01-01", "2026-04-01");
    expect(windowBounds(windows, 99)?.index).toBe(windows.length - 1);
    expect(windowBounds(windows, -5)?.index).toBe(0);
  });
});
