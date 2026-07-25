"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function SignOutButton({ className = "" }: { className?: string }) {
  const { signOut, firebaseConfigured } = useAuth();
  const router = useRouter();

  if (!firebaseConfigured) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className={
        className ||
        "text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
      }
    >
      Sign out
    </button>
  );
}
