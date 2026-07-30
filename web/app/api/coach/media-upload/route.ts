import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { uploadBufferToFirebaseStorage } from "@/lib/firebase/admin-storage";
import {
  audioExtensionFromMime,
  bufferToDataUrl,
  buildCoachMediaStoragePath,
  COACH_AUDIO_MAX_BYTES,
  COACH_VIDEO_MAX_BYTES,
  resolveCoachMediaScope,
  videoExtensionFromMime,
} from "@/lib/firebase/media-upload-path";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const scopeRaw = String(form.get("scope") ?? "").trim();
  const scope = resolveCoachMediaScope(scopeRaw);
  const kind = String(form.get("kind") ?? "audio").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!scope) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const maxBytes = kind === "video" ? COACH_VIDEO_MAX_BYTES : COACH_AUDIO_MAX_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: kind === "video" ? "Video is too large (max 50 MB)." : "Voice note is too large (max 5 MB)." },
      { status: 400 },
    );
  }

  const mime = file.type || (kind === "video" ? "video/webm" : "audio/webm");
  const ext = kind === "video" ? videoExtensionFromMime(mime) : audioExtensionFromMime(mime);
  const path = buildCoachMediaStoragePath(scope, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  const firebaseUrl = await uploadBufferToFirebaseStorage(buffer, path, mime);
  if (firebaseUrl) {
    return NextResponse.json({ url: firebaseUrl });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Media upload failed — check Firebase Storage configuration." },
      { status: 503 },
    );
  }

  const devFallback = `dev://${kind}/${scope}/${Date.now()}.${ext}`;
  const url = await bufferToDataUrl(buffer, mime, devFallback);
  return NextResponse.json({ url });
}
