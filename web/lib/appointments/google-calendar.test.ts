import { afterEach, describe, expect, it } from "vitest";
import {
  buildGoogleAuthUrl,
  googleCalendarConfigured,
  verifyGoogleState,
} from "@/lib/appointments/google-calendar";

const original = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
};

afterEach(() => {
  process.env.GOOGLE_CLIENT_ID = original.clientId;
  process.env.GOOGLE_CLIENT_SECRET = original.clientSecret;
  process.env.GOOGLE_REDIRECT_URI = original.redirectUri;
});

describe("Google Calendar OAuth state", () => {
  it("creates and verifies a signed coach state", () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost/callback";
    expect(googleCalendarConfigured()).toBe(true);

    const url = new URL(
      buildGoogleAuthUrl({ id: "coach-id", tenantId: "tenant-id" }),
    );
    const state = url.searchParams.get("state");
    expect(state).toBeTruthy();
    expect(verifyGoogleState(state!)).toEqual({
      userId: "coach-id",
      tenantId: "tenant-id",
    });
  });

  it("rejects a modified state", () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost/callback";
    const url = new URL(
      buildGoogleAuthUrl({ id: "coach-id", tenantId: "tenant-id" }),
    );
    const state = url.searchParams.get("state")!;
    expect(verifyGoogleState(`${state}changed`)).toBeNull();
  });
});
