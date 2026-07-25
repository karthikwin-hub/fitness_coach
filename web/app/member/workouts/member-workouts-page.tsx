"use client";

import { useEffect, useState } from "react";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import type { Video } from "@/lib/db/schema";
import { MemberWorkoutView } from "./member-workout-view";
import { WorkoutVideoList } from "./workout-video-list";

type Tab = "today" | "library";

export function MemberWorkoutsPage() {
  const getHeaders = useAuthHeaders();
  const [tab, setTab] = useState<Tab>("today");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  useEffect(() => {
    if (tab !== "library") return;
    setLoadingVideos(true);
    authFetchJson<Video[]>("/api/videos", {}, getHeaders)
      .then(({ data }) => setVideos(data ?? []))
      .finally(() => setLoadingVideos(false));
  }, [tab, getHeaders]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-heading text-2xl">Workouts</h1>
        <p className="text-sm text-white/60">
          Today&apos;s plan or browse the exercise video library
        </p>
      </header>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("today")}
          className={`rounded-full px-4 py-2 text-sm ${
            tab === "today"
              ? "bg-[var(--brand-workout)] text-[var(--brand-dark)]"
              : "border border-white/15 text-white/70"
          }`}
        >
          Today&apos;s plan
        </button>
        <button
          type="button"
          onClick={() => setTab("library")}
          className={`rounded-full px-4 py-2 text-sm ${
            tab === "library"
              ? "bg-[var(--brand-workout)] text-[var(--brand-dark)]"
              : "border border-white/15 text-white/70"
          }`}
        >
          Video library
        </button>
      </div>

      {tab === "today" ? (
        <MemberWorkoutView />
      ) : loadingVideos ? (
        <p className="text-white/50">Loading videos…</p>
      ) : videos.length === 0 ? (
        <p className="text-sm text-white/50">No videos in the library yet.</p>
      ) : (
        <WorkoutVideoList videos={videos} />
      )}
    </div>
  );
}
