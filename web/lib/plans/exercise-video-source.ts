import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { classifyVideoSourceFromChannel } from "@/lib/plans/prefer-owned-exercise";
import { getTenantFeatures } from "@/lib/tenant/features";
import { normalizeYoutubeVideoId } from "@/lib/youtube/parse-video-id";

export async function getOwnedYoutubeChannelId(tenantId: string) {
  const [tenant] = await db
    .select({ featuresJson: tenants.featuresJson })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return getTenantFeatures(tenant ?? { featuresJson: {} }).ownedYoutubeChannelId;
}

export function resolveExerciseVideoSource(
  body: {
    videoSource?: unknown;
    youtubeVideoId?: unknown;
  },
  youtubeVideoId: string | null,
  ownedChannelId: string | null | undefined,
): "owned" | "third_party" {
  if (body.videoSource === "owned" || body.videoSource === "third_party") {
    return body.videoSource;
  }
  return classifyVideoSourceFromChannel(youtubeVideoId, ownedChannelId);
}

export function parseYoutubeVideoIdInput(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  return normalizeYoutubeVideoId(String(raw));
}
