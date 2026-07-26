"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DEV_PERSONAS,
  type DevPersonaId,
} from "@/lib/auth/dev-personas";

function LoginContent() {
  const { signInWithGoogle, appUser, loading, firebaseConfigured, switchDevPersona, signOut } =
    useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const switching = searchParams.get("switch") === "1";
  const nextRaw = searchParams.get("next");
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : null;

  useEffect(() => {
    if (switching) {
      void signOut();
    }
  }, [switching, signOut]);

  useEffect(() => {
    if (loading || !appUser || switching) return;
    if (nextPath) {
      router.replace(nextPath);
      return;
    }
    const persona = DEV_PERSONAS.find((p) => p.firebaseUid === appUser.firebaseUid);
    router.replace(
      persona?.memberPath ??
        (appUser.role === "platform_admin"
          ? "/platform"
          : appUser.role === "coach"
            ? "/coach"
            : "/member"),
    );
  }, [loading, appUser, router, switching, nextPath]);

  function enterAs(personaId: DevPersonaId) {
    switchDevPersona(personaId);
    if (nextPath) {
      router.push(nextPath);
      return;
    }
    const persona = DEV_PERSONAS.find((p) => p.id === personaId)!;
    router.push(persona.memberPath);
  }

  if (!loading && appUser && !switching) {
    return null;
  }

  const coachPersonas = DEV_PERSONAS.filter((p) => p.role === "coach");
  const adminPersonas = DEV_PERSONAS.filter((p) => p.role === "platform_admin");
  const memberPersonas = DEV_PERSONAS.filter((p) => p.role === "member");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--brand-dark)] px-6 py-10 text-white">
      <h1 className="font-heading text-2xl">Sign in</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-white/60">
        Google Sign-In for production. Dev shortcuts below when Firebase is not configured.
      </p>

      {firebaseConfigured ? (
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="tap-target mt-8 w-full max-w-md rounded-xl bg-white py-4 font-semibold text-[var(--brand-dark)]"
        >
          Continue with Google
        </button>
      ) : (
        <div className="mt-8 w-full max-w-md space-y-6">
          <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
            Firebase not configured. Pick a dev persona to explore the app.
          </p>

          {adminPersonas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-amber-200">Platform</h2>
              {adminPersonas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => enterAs(p.id)}
                  className="tap-target flex w-full flex-col items-start rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-left font-semibold text-amber-50"
                >
                  {p.label}
                  <span className="mt-0.5 text-xs font-normal opacity-80">{p.description}</span>
                </button>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-[var(--brand-workout)]">Coach</h2>
            {coachPersonas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => enterAs(p.id)}
                className="tap-target flex w-full flex-col items-start rounded-xl bg-[var(--brand-workout)] px-4 py-3 text-left font-semibold text-[var(--brand-dark)]"
              >
                {p.label}
                <span className="mt-0.5 text-xs font-normal opacity-80">{p.description}</span>
              </button>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-[var(--brand-diet)]">Members</h2>
            {memberPersonas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => enterAs(p.id)}
                className="tap-target flex w-full flex-col items-start rounded-xl border border-white/20 px-4 py-3 text-left"
              >
                {p.label}
                <span className="mt-0.5 text-xs text-white/50">{p.description}</span>
              </button>
            ))}
          </section>
        </div>
      )}

      <Link href="/" className="mt-8 text-sm text-white/40">
        Back to home
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--brand-dark)] text-white/50">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
