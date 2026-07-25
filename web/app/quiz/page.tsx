"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { routeQuizOutcome } from "@/lib/quiz/scoring";
import { CalComEmbed } from "@/components/prospect/cal-com-embed";

type Answers = {
  goal: string;
  struggle: string;
  diet: string;
  location: string;
  commitment: string;
  email?: string;
};

const steps = [
  {
    id: "goal",
    question: "What is your primary goal?",
    options: [
      { value: "fat_loss", label: "Fat loss" },
      { value: "muscle_gain", label: "Muscle gain" },
      { value: "general_health", label: "General health" },
    ],
  },
  {
    id: "struggle",
    question: "What is your biggest bottleneck?",
    options: [
      { value: "consistency", label: "Consistency" },
      { value: "diet", label: "Diet / nutrition" },
      { value: "time", label: "Time / schedule" },
    ],
  },
  {
    id: "diet",
    question: "Dietary preference?",
    options: [
      { value: "indian", label: "Indian macros & local diet" },
      { value: "western", label: "Western macros" },
      { value: "hybrid", label: "Global hybrid" },
    ],
  },
  {
    id: "location",
    question: "Where are you based?",
    options: [
      { value: "india", label: "India" },
      { value: "us", label: "United States" },
      { value: "australia", label: "Australia" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "commitment",
    question: "How committed are you to 1-on-1 hybrid coaching?",
    options: [
      { value: "high", label: "Ready — I want a coach" },
      { value: "medium", label: "Interested but exploring" },
      { value: "low", label: "Prefer self-paced content" },
    ],
  },
] as const;

type Phase = "quiz" | "email" | "done";

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    routedTo: string;
    intentScore: number;
  } | null>(null);

  const current = steps[step];
  const progress =
    phase === "email"
      ? 100
      : ((step + 1) / (steps.length + 1)) * 100;

  async function finish(finalAnswers: Partial<Answers>, emailValue: string) {
    setSubmitting(true);
    const withEmail = { ...finalAnswers, email: emailValue.trim() };
    const { intentScore, routedTo } = routeQuizOutcome(withEmail);

    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: "abstrack",
        email: emailValue.trim(),
        responses: withEmail,
        intentScore,
        routedTo,
      }),
    });

    if (routedTo === "waitlist") {
      await fetch("/api/vault-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: "abstrack",
          email: emailValue.trim(),
          location: finalAnswers.location,
        }),
      });
    }

    setDone({ routedTo, intentScore });
    setPhase("done");
    setSubmitting(false);
  }

  function select(value: string) {
    const key = current.id as keyof Answers;
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step < steps.length - 1) {
      setTimeout(() => setStep(step + 1), 200);
    } else {
      setPhase("email");
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    void finish(answers, email);
  }

  if (phase === "done" && done) {
    return (
      <div className="min-h-dvh bg-[var(--brand-dark)] px-4 py-8 text-white">
        <div className="mx-auto max-w-lg">
          {done.routedTo === "coaching" ? (
            <>
              <h1 className="font-heading text-2xl">
                You are a great fit for hybrid coaching
              </h1>
              <p className="mt-3 text-white/70">
                Book a discovery call with Coach Helna to discuss your custom track.
              </p>
              <div className="mt-6">
                <CalComEmbed />
              </div>
              <a
                href={
                  process.env.NEXT_PUBLIC_CAL_COM_URL?.includes("http")
                    ? process.env.NEXT_PUBLIC_CAL_COM_URL
                    : "https://cal.com"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="tap-target mt-4 flex w-full items-center justify-center rounded-xl border border-white/20 py-3 text-sm text-white/70"
              >
                Open booking in new tab
              </a>
            </>
          ) : (
            <>
              <h1 className="font-heading text-2xl">You&apos;re on the waitlist</h1>
              <p className="mt-3 text-white/70">
                Self-paced masterclasses are coming soon. We&apos;ll notify you at{" "}
                <span className="text-[var(--brand-diet)]">{email}</span> when enrollment opens.
              </p>
              <Link
                href="/"
                className="tap-target mt-8 flex w-full items-center justify-center rounded-xl border border-white/20 py-4"
              >
                Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === "email") {
    return (
      <div className="flex min-h-dvh flex-col bg-[var(--brand-dark)] px-4 py-8 text-white">
        <div className="mx-auto w-full max-w-lg flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--brand-workout)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/40">Almost done</p>
          <h1 className="font-heading mt-8 text-xl">Where should we send your results?</h1>
          <p className="mt-2 text-sm text-white/60">
            Your email is used for booking follow-up or vault waitlist updates only.
          </p>
          <form onSubmit={submitEmail} className="mt-6 space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tap-target w-full rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-4 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="tap-target w-full rounded-xl bg-[var(--brand-diet)] py-4 font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "See my track"}
            </button>
          </form>
        </div>
        <button
          type="button"
          onClick={() => setPhase("quiz")}
          className="mx-auto mb-4 text-sm text-white/50"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--brand-dark)] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-lg flex-1">
        <p className="text-sm text-white/50">
          Hi! I&apos;m Helna&apos;s virtual guide. Let&apos;s find your custom track.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--brand-workout)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/40">
          Step {step + 1} of {steps.length}
        </p>

        <h1 className="font-heading mt-8 text-xl">{current.question}</h1>
        <ul className="mt-6 space-y-3">
          {current.options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => select(opt.value)}
                className="tap-target w-full rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-4 text-left text-sm font-medium transition-colors hover:border-[var(--brand-workout)]"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className="mx-auto mb-4 text-sm text-white/50"
        >
          Back
        </button>
      )}
    </div>
  );
}
