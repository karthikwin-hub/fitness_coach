"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

export function BrandStyles() {
  const { appUser, loading } = useAuth();
  const getHeaders = useAuthHeaders();

  useEffect(() => {
    if (loading) return;
    authFetch("/api/tenant/branding", {}, getHeaders)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.cssVars) return;
        const root = document.documentElement;
        for (const [key, value] of Object.entries(data.cssVars as Record<string, string>)) {
          root.style.setProperty(key, value);
        }
      })
      .catch(() => {});
  }, [appUser?.tenantSlug, loading, getHeaders]);

  return null;
}
