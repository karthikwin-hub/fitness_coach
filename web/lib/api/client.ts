"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { devTokenForUid } from "@/lib/auth/dev-personas";
import { isDevAuthEnabled } from "@/lib/auth/dev-auth-enabled";
import { authFetch, authFetchJson } from "@/lib/api/fetch-json";

export { authFetch, authFetchJson };

export function getDevAuthToken(role: "coach" | "member") {
  return role === "member" ? "dev-local-member" : "dev-local-token";
}

export function useAuthHeaders(): () => Promise<Record<string, string>> {
  const { firebaseUser, appUser, firebaseConfigured } = useAuth();

  return useCallback(async (): Promise<Record<string, string>> => {
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken();
      return { Authorization: `Bearer ${token}` };
    }
    if (!firebaseConfigured && isDevAuthEnabled() && appUser) {
      const token = devTokenForUid(appUser.firebaseUid) ?? "dev-local-token";
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }, [firebaseUser, appUser, firebaseConfigured]);
}
