"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformTenantsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/platform");
  }, [router]);
  return <p className="text-white/50">Redirecting…</p>;
}
