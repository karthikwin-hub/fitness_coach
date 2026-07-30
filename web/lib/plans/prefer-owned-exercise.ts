export type ExerciseCatalogRow = {
  id: string;
  name: string;
  slug: string | null;
  videoSource?: "owned" | "third_party" | null;
};

export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

/** When duplicate names exist, prefer the coach-owned video row. */
export function preferOwnedExerciseId(
  catalog: ExerciseCatalogRow[],
  exerciseId: string,
): string {
  const current = catalog.find((e) => e.id === exerciseId);
  if (!current) return exerciseId;

  const norm = normalizeExerciseName(current.name);
  const owned = catalog.find(
    (e) =>
      e.videoSource === "owned" &&
      e.id !== exerciseId &&
      normalizeExerciseName(e.name) === norm,
  );
  return owned?.id ?? exerciseId;
}

export function buildExerciseMapBySlugWithOwnedPreference(
  catalog: ExerciseCatalogRow[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const ex of catalog) {
    if (ex.slug) map[ex.slug] = ex.id;
  }
  for (const slug of Object.keys(map)) {
    map[slug] = preferOwnedExerciseId(catalog, map[slug]!);
  }
  return map;
}

export function formatExerciseOptionLabel(ex: ExerciseCatalogRow): string {
  const source =
    ex.videoSource === "owned"
      ? "Coach"
      : ex.videoSource === "third_party"
        ? "Third party"
        : null;
  return source ? `${ex.name} (${source})` : ex.name;
}

export function sortCatalogForPicker(catalog: ExerciseCatalogRow[]): ExerciseCatalogRow[] {
  return [...catalog].sort((a, b) => {
    const aOwned = a.videoSource === "owned" ? 0 : 1;
    const bOwned = b.videoSource === "owned" ? 0 : 1;
    if (aOwned !== bOwned) return aOwned - bOwned;
    return a.name.localeCompare(b.name);
  });
}

export function classifyVideoSourceFromChannel(
  youtubeVideoIdOrUrl: string | null | undefined,
  ownedChannelId: string | null | undefined,
): "owned" | "third_party" {
  if (!ownedChannelId || !youtubeVideoIdOrUrl) return "third_party";
  return youtubeVideoIdOrUrl.includes(ownedChannelId) ? "owned" : "third_party";
}
