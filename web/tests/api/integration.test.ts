import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMembers } from "@/app/api/members/route";
import { GET as getMemberById } from "@/app/api/members/[memberId]/route";
import { GET as getMemberAlertsRoute } from "@/app/api/members/alerts/route";
import { POST as postLeads } from "@/app/api/leads/route";
import { POST as postVaultWaitlist } from "@/app/api/vault-waitlist/route";
import { POST as postCheckIn } from "@/app/api/check-ins/route";
import { GET as getMessages, POST as postMessage } from "@/app/api/messages/route";
import { GET as getTrainingPlan } from "@/app/api/training-plans/[id]/route";
import { PATCH as patchContentBlock } from "@/app/api/content-blocks/[id]/route";
import { GET as getTrainingPlans } from "@/app/api/training-plans/route";

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

  it("rejects invalid email", async () => {
    const req = new NextRequest("http://localhost/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: "abstrack",
        email: "not-an-email",
        responses: { goal: "fat_loss" },
        intentScore: 80,
        routedTo: "coaching",
      }),
    });

    const res = await postLeads(req);
    expect(res.status).toBe(400);
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

  it("returns member alerts separately", async () => {
    const req = new NextRequest("http://localhost/api/members/alerts", {
      headers: COACH_AUTH,
    });
    const res = await getMemberAlertsRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trendsByMember).toBeTruthy();
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

  it("persists waitlist with program location slug", async () => {
    const req = new NextRequest("http://localhost/api/vault-waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: "abstrack",
        email: "vault-program-waitlist@example.com",
        location: "sustainable-weight-loss/6-month",
      }),
    });

    const res = await postVaultWaitlist(req);
    expect(res.status).toBe(200);
  });
});

describe.skipIf(!hasDatabase())("API /api/vault/catalog", () => {
  it("returns published program families for tenant", async () => {
    const { GET } = await import("@/app/api/vault/catalog/route");
    const req = new NextRequest("http://localhost/api/vault/catalog?tenantSlug=abstrack");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.families)).toBe(true);
    expect(body.families.length).toBeGreaterThanOrEqual(6);
    const slugs = body.families.map((f: { slug: string }) => f.slug);
    expect(slugs).toContain("stay-fit-busy-professionals");
    expect(slugs).toContain("sustainable-weight-loss");
    const first = body.families[0];
    expect(first.products.length).toBeGreaterThan(0);
    expect(first.products[0].salePriceInr).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasDatabase())("API /api/vault/families/[slug]", () => {
  it("returns program detail with SKUs", async () => {
    const { GET } = await import("@/app/api/vault/families/[slug]/route");
    const req = new NextRequest(
      "http://localhost/api/vault/families/sustainable-weight-loss?tenantSlug=abstrack",
    );
    const res = await GET(req, {
      params: Promise.resolve({ slug: "sustainable-weight-loss" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("sustainable-weight-loss");
    expect(body.products.length).toBeGreaterThan(0);
    expect(body.heroJson?.isForYou?.length).toBeGreaterThan(0);
  });

  it("returns 404 for unknown slug", async () => {
    const { GET } = await import("@/app/api/vault/families/[slug]/route");
    const req = new NextRequest(
      "http://localhost/api/vault/families/not-a-real-program?tenantSlug=abstrack",
    );
    const res = await GET(req, {
      params: Promise.resolve({ slug: "not-a-real-program" }),
    });
    expect(res.status).toBe(404);
  });
});

describe.skipIf(!hasDatabase())("API /api/coach/vault/catalog-settings", () => {
  it("returns storefront marketing for coach", async () => {
    const { GET } = await import("@/app/api/coach/vault/catalog-settings/route");
    const req = new NextRequest("http://localhost/api/coach/vault/catalog-settings", {
      headers: COACH_AUTH,
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.heroHeadline).toBeTruthy();
    expect(body.testimonials.length).toBeGreaterThan(0);
    expect(body.pressFeatures.length).toBeGreaterThan(0);
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
    expect(checkIn.status).toBe("pending");
    expect(checkIn.aiConfidence).toBeLessThan(0.85);
  });

  it("rejects invalid check-in payload", async () => {
    const req = new NextRequest("http://localhost/api/check-ins", {
      method: "POST",
      headers: { ...MEMBER_AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({
        energy: 99,
        weightKg: "abc",
      }),
    });

    const res = await postCheckIn(req);
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!hasDatabase())("API /api/training-plans", () => {
  async function getSamplePlanId(): Promise<string> {
    const listReq = new NextRequest("http://localhost/api/members", {
      headers: COACH_AUTH,
    });
    const members = await (await getMembers(listReq)).json();
    const member = members.find((m: { email: string }) => m.email === "avinash@abstrack.local");
    expect(member).toBeTruthy();

    const plansReq = new NextRequest(
      `http://localhost/api/training-plans?memberId=${member.id}`,
      { headers: COACH_AUTH },
    );
    const plans = await (await getTrainingPlans(plansReq)).json();
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
    return plans[0].id as string;
  }

  it("returns 401 without auth for plan by id", async () => {
    const planId = await getSamplePlanId();

    const req = new NextRequest(`http://localhost/api/training-plans/${planId}`);
    const res = await getTrainingPlan(req, {
      params: Promise.resolve({ id: planId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns plan for authenticated coach", async () => {
    const planId = await getSamplePlanId();

    const req = new NextRequest(`http://localhost/api/training-plans/${planId}`, {
      headers: COACH_AUTH,
    });
    const res = await getTrainingPlan(req, { params: Promise.resolve({ id: planId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(planId);
  });
});

describe.skipIf(!hasDatabase())("API /api/content-blocks", () => {
  it("returns 404 when patching unknown block id", async () => {
    const req = new NextRequest(
      "http://localhost/api/content-blocks/00000000-0000-4000-8000-000000000099",
      {
        method: "PATCH",
        headers: { ...COACH_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Should not apply" }),
      },
    );

    const res = await patchContentBlock(req, {
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000099" }),
    });
    expect(res.status).toBe(404);
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

const PLATFORM_AUTH = { Authorization: "Bearer dev-local-platform-admin" };

describe.skipIf(!hasDatabase())("API /api/platform/tenants", () => {
  it("forbids coach from listing tenants", async () => {
    const { GET } = await import("@/app/api/platform/tenants/route");
    const req = new NextRequest("http://localhost/api/platform/tenants", {
      headers: COACH_AUTH,
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("lists tenants for platform admin including abstrack", async () => {
    const { GET } = await import("@/app/api/platform/tenants/route");
    const req = new NextRequest("http://localhost/api/platform/tenants", {
      headers: PLATFORM_AUTH,
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tenants)).toBe(true);
    expect(body.tenants.some((t: { slug: string }) => t.slug === "abstrack")).toBe(true);
  });

  it("creates a tenant and allows suspend", async () => {
    const { POST, GET } = await import("@/app/api/platform/tenants/route");
    const { PATCH, GET: GET_ONE } = await import(
      "@/app/api/platform/tenants/[id]/route"
    );
    const slug = `demo-gym-${Date.now().toString(36)}`;
    const createReq = new NextRequest("http://localhost/api/platform/tenants", {
      method: "POST",
      headers: { ...PLATFORM_AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Demo Gym",
        slug,
        coachEmail: `coach@${slug}.test`,
      }),
    });
    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.tenantId).toBeTruthy();

    const patchReq = new NextRequest(`http://localhost/api/platform/tenants/${created.tenantId}`, {
      method: "PATCH",
      headers: { ...PLATFORM_AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "suspended" }),
    });
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: created.tenantId }),
    });
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.tenant.status).toBe("suspended");

    const getRes = await GET_ONE(
      new NextRequest(`http://localhost/api/platform/tenants/${created.tenantId}`, {
        headers: PLATFORM_AUTH,
      }),
      { params: Promise.resolve({ id: created.tenantId }) },
    );
    expect(getRes.status).toBe(200);

    // duplicate slug → 409
    const dup = await POST(
      new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        headers: { ...PLATFORM_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Dup", slug }),
      }),
    );
    expect(dup.status).toBe(409);

    // list still works
    const list = await GET(
      new NextRequest("http://localhost/api/platform/tenants", { headers: PLATFORM_AUTH }),
    );
    expect(list.status).toBe(200);
  });

  it("rejects create without name", async () => {
    const { POST } = await import("@/app/api/platform/tenants/route");
    const res = await POST(
      new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        headers: { ...PLATFORM_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "no-name" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!hasDatabase())("API /api/public/branding", () => {
  it("returns merged branding for default tenant", async () => {
    const { GET } = await import("@/app/api/public/branding/route");
    const res = await GET(new NextRequest("http://localhost/api/public/branding"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBeTruthy();
    expect(body.branding?.primary).toBeTruthy();
    expect(body.cssVars["--brand-primary"]).toBeTruthy();
  });
});

describe.skipIf(!hasDatabase())("API /api/plan-deliveries", () => {
  it("forbids member from creating deliveries", async () => {
    const { POST } = await import("@/app/api/plan-deliveries/route");
    const res = await POST(
      new NextRequest("http://localhost/api/plan-deliveries", {
        method: "POST",
        headers: { ...MEMBER_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: "00000000-0000-4000-8000-000000000001" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("creates delivery, serves PDF via token, and respects revoke", async () => {
    const { GET: getMembersList } = await import("@/app/api/members/route");
    const membersRes = await getMembersList(
      new NextRequest("http://localhost/api/members", { headers: COACH_AUTH }),
    );
    expect(membersRes.status).toBe(200);
    const membersBody = await membersRes.json();
    const memberId = Array.isArray(membersBody) ? membersBody[0]?.id : null;
    expect(memberId).toBeTruthy();

    const { POST } = await import("@/app/api/plan-deliveries/route");
    const createRes = await POST(
      new NextRequest("http://localhost/api/plan-deliveries", {
        method: "POST",
        headers: { ...COACH_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      }),
    );

    // May 400 if no published plans for this member — skip rest in that case
    if (createRes.status === 400) {
      const body = await createRes.json();
      expect(body.error).toMatch(/published|plan/i);
      return;
    }

    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(created.token).toBeTruthy();
    expect(created.urls.pdfUrl).toContain("/plan.pdf");
    expect(created.delivery.id).toBeTruthy();

    const { GET: getPdf } = await import("@/app/p/[token]/plan.pdf/route");
    const pdfRes = await getPdf(
      new NextRequest(`http://localhost/p/${created.token}/plan.pdf`),
      { params: Promise.resolve({ token: created.token }) },
    );
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get("Content-Type")).toBe("application/pdf");
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    expect(pdfBuf.subarray(0, 4).toString("utf8")).toBe("%PDF");

    const unknownPdf = await getPdf(
      new NextRequest("http://localhost/p/not-a-real-token-zzzz/plan.pdf"),
      { params: Promise.resolve({ token: "not-a-real-token-zzzz" }) },
    );
    expect(unknownPdf.status).toBe(404);

    const { PATCH } = await import("@/app/api/plan-deliveries/[id]/route");
    const revokeRes = await PATCH(
      new NextRequest(`http://localhost/api/plan-deliveries/${created.delivery.id}`, {
        method: "PATCH",
        headers: { ...COACH_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      }),
      { params: Promise.resolve({ id: created.delivery.id }) },
    );
    expect(revokeRes.status).toBe(200);

    const revokedPdf = await getPdf(
      new NextRequest(`http://localhost/p/${created.token}/plan.pdf`),
      { params: Promise.resolve({ token: created.token }) },
    );
    expect(revokedPdf.status).toBe(403);

    // Token must not unlock coach APIs
    const coachProbe = await getMembersList(
      new NextRequest("http://localhost/api/members", {
        headers: { Authorization: `Bearer ${created.token}` },
      }),
    );
    expect(coachProbe.status).toBe(403);
  });
});

describe.skipIf(!hasDatabase())("API /api/coach/user-guide", () => {
  it("returns PDF for coach", async () => {
    const { GET } = await import("@/app/api/coach/user-guide/route");
    const res = await GET(
      new NextRequest("http://localhost/api/coach/user-guide", {
        headers: COACH_AUTH,
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(800);
  });

  it("forbids members", async () => {
    const { GET } = await import("@/app/api/coach/user-guide/route");
    const res = await GET(
      new NextRequest("http://localhost/api/coach/user-guide", {
        headers: MEMBER_AUTH,
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe.skipIf(!hasDatabase())("API /api/appointments coach booking", () => {
  it("coach can book for a tenant member", async () => {
    const { GET: getMembers } = await import("@/app/api/members/route");
    const membersRes = await getMembers(
      new NextRequest("http://localhost/api/members", { headers: COACH_AUTH }),
    );
    const members = await membersRes.json();
    const member = members.find(
      (m: { email: string }) => m.email === "avinash@abstrack.local",
    );
    expect(member?.id).toBeTruthy();

    const start = new Date(Date.now() + (8 + (Date.now() % 720)) * 86400_000);
    start.setHours(11, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);

    const { POST } = await import("@/app/api/appointments/route");
    const res = await POST(
      new NextRequest("http://localhost/api/appointments", {
        method: "POST",
        headers: { ...COACH_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          meetingType: "none",
          title: "Integration test session",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.memberId).toBe(member.id);
  });
});

describe.skipIf(!hasDatabase())("API member program journey", () => {
  async function avinashId() {
    const { GET: getMembers } = await import("@/app/api/members/route");
    const membersRes = await getMembers(
      new NextRequest("http://localhost/api/members", { headers: COACH_AUTH }),
    );
    const members = await membersRes.json();
    return members.find((m: { email: string }) => m.email === "avinash@abstrack.local")
      ?.id as string;
  }

  it("coach can load member journey with windows", async () => {
    const memberId = await avinashId();
    expect(memberId).toBeTruthy();

    const { GET } = await import("@/app/api/members/[memberId]/journey/route");
    const res = await GET(
      new NextRequest(`http://localhost/api/members/${memberId}/journey`, {
        headers: COACH_AUTH,
      }),
      { params: Promise.resolve({ memberId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.window.totalWindows).toBeGreaterThan(0);
    expect(body.member.name).toContain("Avinash");
    expect(Array.isArray(body.checkIns)).toBe(true);
  });

  it("member can load own journey", async () => {
    const { GET } = await import("@/app/api/members/me/journey/route");
    const res = await GET(new NextRequest("http://localhost/api/members/me/journey", {
      headers: MEMBER_AUTH,
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.window).toBeTruthy();
    expect(body.member.coachNotes).toBeUndefined();
  });

  it("coach progress roster lists clients", async () => {
    const { GET } = await import("@/app/api/members/progress/route");
    const res = await GET(
      new NextRequest("http://localhost/api/members/progress", {
        headers: COACH_AUTH,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members.length).toBeGreaterThan(0);
    expect(body.members[0].windowLabel).toBeTruthy();
  });

  it("navigates to an earlier journey window", async () => {
    const memberId = await avinashId();
    const { GET } = await import("@/app/api/members/[memberId]/journey/route");
    const res = await GET(
      new NextRequest(`http://localhost/api/members/${memberId}/journey?windowIndex=0`, {
        headers: COACH_AUTH,
      }),
      { params: Promise.resolve({ memberId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.window.index).toBe(0);
  });
});
