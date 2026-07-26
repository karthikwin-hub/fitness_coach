"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

function applyCssVars(cssVars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }
}

export function BrandStyles() {
  const { appUser, loading } = useAuth();
  const getHeaders = useAuthHeaders();

  useEffect(() => {
    if (loading) return;

    if (appUser) {
      authFetch("/api/tenant/branding", {}, getHeaders)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.cssVars) applyCssVars(data.cssVars);
        })
        .catch(() => {});
      return;
    }

    fetch("/api/public/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.cssVars) applyCssVars(data.cssVars);
      })
      .catch(() => {});
  }, [appUser?.tenantSlug, loading, getHeaders]);

  return null;
}
