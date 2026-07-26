import { scoreCompliance } from "./compliance";
import { assertAllowedPhotoUrl } from "./photo-url";

export type MacroTargets = {
  caloriesMin?: number | null;
  caloriesMax?: number | null;
  proteinMin?: number | null;
  proteinMax?: number | null;
  carbsMax?: number | null;
  fatMin?: number | null;
  fatMax?: number | null;
};

export type MealAnalysis = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  summary: string;
  complianceScore: number;
  flags: string[];
};

export { scoreCompliance };

export class GeminiParseError extends Error {
  constructor(message = "Gemini returned invalid JSON") {
    super(message);
    this.name = "GeminiParseError";
  }
}

export async function analyzeMealPhoto(
  imageUrl: string,
  targets: MacroTargets,
): Promise<MealAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const stub = {
      calories: 420,
      proteinG: 28,
      carbsG: 45,
      fatG: 14,
      summary: "Dev stub: balanced meal with moderate protein.",
    };
    const { score, flags } = scoreCompliance(stub, targets);
    return { ...stub, complianceScore: score, flags };
  }

  assertAllowedPhotoUrl(imageUrl);

  const prompt = `Analyze this meal photo. Return ONLY valid JSON with keys: calories (number), proteinG, carbsG, fatG, summary (one sentence). Member targets: protein ${targets.proteinMin}-${targets.proteinMax}g, carbs max ${targets.carbsMax}g, calories ${targets.caloriesMin}-${targets.caloriesMax}.`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: await fetchImageBase64(imageUrl),
                },
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  let parsed: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    summary: string;
  };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiParseError();
  }

  const { score, flags } = scoreCompliance(parsed, targets);
  return { ...parsed, complianceScore: score, flags };
}

async function fetchImageBase64(url: string): Promise<string> {
  assertAllowedPhotoUrl(url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch meal photo: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}
