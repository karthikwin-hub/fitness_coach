import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMembers } from "@/app/api/members/route";
import { GET as getMemberById } from "@/app/api/members/[memberId]/route";
import { POST as postLeads } from "@/app/api/leads/route";
import { POST as postVaultWaitlist } from "@/app/api/vault-waitlist/route";
import { POST as postCheckIn } from "@/app/api/check-ins/route";
import { GET as getMessages, POST as postMessage } from "@/app/api/messages/route";

const COACH_AUTH = { Authorization: "Bearer dev-local-token" };
const MEMBER_AUTH = { Authorization: "Bearer dev-local-member" };

function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

describe.skipIf(!hasDatabase())("API /api/leads", () => {
  it("persists a quiz lead", async () => {
    const req = new NextRequest("http://localhost/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: "abstrack",
        responses: {
          goal: "fat_loss",
          commitment: "high",
          location: "india",
        },
        intentScore: 80,
        routedTo: "coaching",
      }),
    });

    const res = await postLeads(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeTruthy();
  });
});

describe.skipIf(!hasDatabase())("API /api/members", () => {
  it("returns member list for coach", async () => {
    const req = new NextRequest("http://localhost/api/members", {
      headers: COACH_AUTH,
    });
    const res = await getMembers(req);
    expect(res.status).toBe(200);
    const members = await res.json();
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThan(0);
    expect(members.some((m: { email: string }) => m.email === "avinash@abstrack.local")).toBe(
      true,
    );
  });

  it("returns 403 without auth", async () => {
    const req = new NextRequest("http://localhost/api/members");
    const res = await getMembers(req);
    expect(res.status).toBe(403);
  });

  it("returns profile for valid member id", async () => {
    const listReq = new NextRequest("http://localhost/api/members", {
      headers: COACH_AUTH,
    });
    const listRes = await getMembers(listReq);
    const members = await listRes.json();
    const avinash = members.find((m: { email: string }) => m.email === "avinash@abstrack.local");
    expect(avinash).toBeTruthy();

    const req = new NextRequest(`http://localhost/api/members/${avinash.id}`, {
      headers: COACH_AUTH,
    });
    const res = await getMemberById(req, { params: Promise.resolve({ memberId: avinash.id }) });
    expect(res.status).toBe(200);
    const profile = await res.json();
    expect(profile.firstName).toBe("Avinash");
  });

  it("returns 400 for invalid member id", async () => {
    const req = new NextRequest("http://localhost/api/members/undefined", {
      headers: COACH_AUTH,
    });
    const res = await getMemberById(req, { params: Promise.resolve({ memberId: "undefined" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid member id");
  });
});

describe.skipIf(!hasDatabase())("API /api/vault-waitlist", () => {
  it("persists waitlist signup", async () => {
    const req = new NextRequest("http://localhost/api/vault-waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: "abstrack",
        email: "waitlist-test@example.com",
        location: "india",
      }),
    });

    const res = await postVaultWaitlist(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeTruthy();
  });
});

describe.skipIf(!hasDatabase())("API /api/check-ins", () => {
  it("creates check-in with stub AI approval for demo member", async () => {
    const req = new NextRequest("http://localhost/api/check-ins", {
      method: "POST",
      headers: { ...MEMBER_AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({
        mealPhotoUrl: "https://example.com/meal.jpg",
        weightKg: 72,
        sleepHours: 7,
        energy: 8,
        soreness: 3,
      }),
    });

    const res = await postCheckIn(req);
    expect(res.status).toBe(201);
    const checkIn = await res.json();
    expect(checkIn.aiConfidence).not.toBeNull();
    // Demo member (Hetal) has high protein targets; dev stub meal scores below 85% → pending
    expect(checkIn.status).toBe("pending");
    expect(checkIn.aiConfidence).toBeLessThan(0.85);
  });
});

describe.skipIf(!hasDatabase())("API /api/messages", () => {
  it("returns thread for coach with memberId", async () => {
    const listReq = new NextRequest("http://localhost/api/members", {
      headers: COACH_AUTH,
    });
    const listRes = await getMembers(listReq);
    const membersList = await listRes.json();
    const demo = membersList.find(
      (m: { email: string }) => m.email === "member@abstrack.local",
    );
    expect(demo).toBeTruthy();

    const req = new NextRequest(
      `http://localhost/api/messages?memberId=${demo.id}`,
      { headers: COACH_AUTH },
    );
    const res = await getMessages(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("member can post a message", async () => {
    const req = new NextRequest("http://localhost/api/messages", {
      method: "POST",
      headers: { ...MEMBER_AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Integration test ping" }),
    });
    const res = await postMessage(req);
    expect(res.status).toBe(201);
    const message = await res.json();
    expect(message.body).toBe("Integration test ping");
    expect(message.isMine).toBe(true);
  });

  it("coach requires memberId on GET", async () => {
    const req = new NextRequest("http://localhost/api/messages", {
      headers: COACH_AUTH,
    });
    const res = await getMessages(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown memberId", async () => {
    const req = new NextRequest(
      "http://localhost/api/messages?memberId=00000000-0000-4000-8000-000000000099",
      { headers: COACH_AUTH },
    );
    const res = await getMessages(req);
    expect(res.status).toBe(404);
  });
});
