"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { readPhilosophySlide, storePhilosophySlide } from "@/lib/philosophy/storage";

const slides = [
  {
    id: "intro",
    kicker: "Meet Coach Helna",
    title: "Hybrid coaching for busy professionals",
    body: "Helna coaches clients across India, the US, and Australia — blending nutrition science, sustainable training, and accountability that fits real life.",
    image: "/philosophy/intro-hero.svg",
    accent: "var(--brand-workout)",
  },
  {
    id: "nutrition",
    kicker: "Pillar 1",
    title: "Nutrition First",
    body: "Macro-aware meal check-ins and photo reviews — not guesswork.",
    image: "/philosophy/nutrition-first.svg",
    accent: "var(--brand-diet)",
  },
  {
    id: "movement",
    kicker: "Pillar 2",
    title: "Sustainable Movement",
    body: "Workouts that fit travel, time zones, and real life.",
    image: "/philosophy/sustainable-movement.svg",
    accent: "var(--brand-workout)",
  },
  {
    id: "data",
    kicker: "Pillar 3",
    title: "Data-Driven Accountability",
    body: "Streaks, compliance, and coach feedback in one place.",
    image: "/philosophy/data-accountability.svg",
    accent: "var(--brand-primary)",
  },
];

export function PhilosophyOnboarding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncSlide = useCallback((index: number) => {
    setActiveIndex(index);
    storePhilosophySlide(index);
  }, []);

  useEffect(() => {
    const saved = readPhilosophySlide();
    if (saved > 0 && containerRef.current) {
      const slide = containerRef.current.querySelector(`[data-slide="${saved}"]`);
      slide?.scrollIntoView({ behavior: "auto" });
      setActiveIndex(saved);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.slide);
            if (!Number.isNaN(idx)) syncSlide(idx);
          }
        }
      },
      { root: el, threshold: 0.6 },
    );

    el.querySelectorAll("[data-slide]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [syncSlide]);

  function scrollToSlide(index: number) {
    const slide = containerRef.current?.querySelector(`[data-slide="${index}"]`);
    slide?.scrollIntoView({ behavior: "smooth" });
    syncSlide(index);
  }

  return (
    <div className="relative h-dvh bg-[var(--brand-dark)] text-white">
      <div
        ref={containerRef}
        className="philosophy-scroll h-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
      >
        {slides.map((slide, index) => (
          <section
            key={slide.id}
            data-slide={index}
            className="philosophy-slide relative flex min-h-dvh snap-start snap-always flex-col justify-end px-4 pb-28 pt-8"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90">
              <Image
                src={slide.image}
                alt=""
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-dark)] via-[var(--brand-dark)]/80 to-transparent" />
            </div>
            <div className="relative z-10 mx-auto w-full max-w-lg">
              <p className="text-sm font-semibold" style={{ color: slide.accent }}>
                {slide.kicker}
              </p>
              <h2 className="font-heading mt-2 text-3xl leading-tight">{slide.title}</h2>
              <p className="mt-3 text-base text-white/75">{slide.body}</p>
            </div>
          </section>
        ))}

        <section
          data-slide={slides.length}
          className="philosophy-slide flex min-h-dvh snap-start snap-always flex-col items-center justify-center px-4"
        >
          <div className="mx-auto max-w-lg text-center">
            <p className="text-sm text-[var(--brand-diet)]">Ready when you are</p>
            <h2 className="font-heading mt-2 text-2xl">Find your custom track</h2>
            <p className="mt-3 text-white/70">
              Take the 5-step quiz — Helna&apos;s guide will route you to hybrid coaching or the
              content vault waitlist.
            </p>
            <Link
              href="/quiz"
              className="tap-target mt-8 flex w-full items-center justify-center rounded-xl bg-[var(--brand-diet)] py-4 font-semibold text-[var(--brand-dark)]"
            >
              Start the 5-step quiz
            </Link>
            <Link href="/" className="mt-4 block text-sm text-white/40 underline">
              Back to home
            </Link>
          </div>
        </section>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[var(--brand-dark)] to-transparent px-4 pb-6 pt-12">
        <div className="pointer-events-auto mx-auto flex max-w-lg items-center justify-between">
          <div className="flex gap-1.5">
            {[...slides, { id: "cta" }].map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => scrollToSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  activeIndex === i ? "w-6 bg-[var(--brand-workout)]" : "w-2 bg-white/25"
                }`}
              />
            ))}
          </div>
          {activeIndex < slides.length && (
            <button
              type="button"
              onClick={() => scrollToSlide(activeIndex + 1)}
              className="tap-target rounded-full bg-white/10 px-4 py-2 text-xs font-medium"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
