"use client";

import { useMemo, useState } from "react";
import type { Video } from "@/lib/db/schema";

const filters = [
  { id: "all", label: "All" },
  { id: "chest", label: "Chest" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "home", label: "Home" },
];

export function WorkoutVideoList({ videos }: { videos: Video[] }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Video | null>(videos[0] ?? null);
  const [sets, setSets] = useState<boolean[]>([false, false, false]);

  const filtered = useMemo(() => {
    if (filter === "all") return videos;
    return videos.filter((v) => v.muscleGroup === filter);
  }, [videos, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium ${
              filter === f.id
                ? "bg-[var(--brand-workout)] text-[var(--brand-dark)]"
                : "bg-white/10 text-white/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              title={selected.title}
              src={`https://www.youtube-nocookie.com/embed/${selected.youtubeVideoId}?rel=0&modestbranding=1`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <h2 className="font-heading">{selected.title}</h2>
            <p className="mt-1 text-xs text-white/50">
              {selected.muscleGroup} · {selected.equipment} · {selected.skillLevel}
            </p>
            <ul className="mt-4 space-y-2">
              {sets.map((done, i) => (
                <li key={i}>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => {
                        const next = [...sets];
                        next[i] = !next[i];
                        setSets(next);
                      }}
                      className="h-5 w-5 rounded accent-[var(--brand-workout)]"
                    />
                    Set {i + 1}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => {
                setSelected(v);
                setSets([false, false, false]);
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
                selected?.id === v.id
                  ? "border-[var(--brand-workout)] bg-[var(--brand-workout)]/10"
                  : "border-white/10 bg-[var(--brand-dark-surface)]"
              }`}
            >
              {v.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
