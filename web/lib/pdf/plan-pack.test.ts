import { describe, expect, it } from "vitest";
import type { PlanDeliverySnapshot } from "@/lib/plans/delivery-snapshot";
import { memberDisplayName } from "@/lib/plans/delivery-snapshot";
import { renderPlanPackPdf } from "@/lib/pdf/plan-pack";

const fixture: PlanDeliverySnapshot = {
  branding: {
    name: "Abs-Track",
    tagline: "Stop Guessing.",
    accentMode: "dual",
    primary: "#1D6468",
    accentWorkout: "#16B1A9",
    accentDiet: "#8AC75B",
    accentPromo: "#1D6468",
  },
  member: {
    id: "m1",
    firstName: "Hetal",
    lastName: "Shah",
    displayName: "Hetal Shah",
    email: "hetal@example.com",
    phone: "+1 415 555 0142",
  },
  coach: { displayName: "Helna", email: "helna@example.com" },
  weekLabel: "Week 7",
  deliveredAt: "2026-07-26T12:00:00.000Z",
  training: {
    id: "t1",
    weekNumber: 7,
    stepGoal: 10000,
    blocks: [
      {
        id: "b1",
        title: "Workout guidelines",
        category: "workout_guidelines",
        bodyJson: { items: ["Warm up 5 minutes", "Rest 60–90s"] },
      },
    ],
    days: [
      {
        dayIndex: 0,
        label: "Day 1 — Upper",
        muscleGroup: "Upper body",
        sections: [
          {
            type: "resistance",
            restNote: "60s rest",
            exercises: [
              {
                id: "e1",
                name: "Push-up",
                youtubeVideoId: "abc123",
                reps: "10-12",
                sets: 3,
                supersetGroup: "A",
              },
              {
                id: "e2",
                name: "Row",
                youtubeVideoId: null,
                reps: "10",
                sets: 3,
                supersetGroup: "A",
              },
            ],
          },
        ],
      },
    ],
  },
  nutrition: {
    id: "n1",
    weekNumber: 7,
    caloriesMin: 1600,
    caloriesMax: 1800,
    proteinMin: 100,
    proteinMax: 120,
    carbsMax: 180,
    fatMin: 40,
    fatMax: 60,
    blocks: [
      {
        id: "nb1",
        title: "Grocery list",
        category: "grocery_list",
        bodyJson: {
          categories: {
            Produce: ["Spinach", "Broccoli"],
            Protein: ["Eggs", "Chicken"],
            Pantry: ["Oats"],
            Other: ["Green tea"],
          },
        },
      },
      {
        id: "nb2",
        title: "Welcome",
        category: "welcome_letter",
        bodyJson: {
          template: "Welcome Hetal! Your program starts soon.",
        },
      },
    ],
  },
};

describe("renderPlanPackPdf", () => {
  it("renders a non-empty PDF buffer", async () => {
    const urls = {
      baseUrl: "https://example.com",
      viewerUrl: "https://example.com/p/tok",
      pdfUrl: "https://example.com/p/tok/plan.pdf",
    };
    const buf = await renderPlanPackPdf(fixture, urls, "tok");
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });

  it("produces similar-sized output for the same snapshot", async () => {
    const urls = {
      baseUrl: "https://example.com",
      viewerUrl: "https://example.com/p/tok",
      pdfUrl: "https://example.com/p/tok/plan.pdf",
    };
    const a = await renderPlanPackPdf(fixture, urls, "tok");
    const b = await renderPlanPackPdf(fixture, urls, "tok");
    expect(a.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(b.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(Math.abs(a.length - b.length)).toBeLessThan(2000);
  });
});

describe("memberDisplayName", () => {
  it("prefers first+last", () => {
    expect(memberDisplayName(fixture)).toBe("Hetal Shah");
  });
});
