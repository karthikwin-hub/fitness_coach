import type { FoodSearchResult } from "@/lib/nutrition/types";

const DEV_FOODS: FoodSearchResult[] = [
  {
    externalFoodId: "dev-oats",
    externalProvider: "dev",
    foodName: "Oats with milk",
    servingDescription: "1 bowl",
    calories: 320,
    proteinG: 12,
    carbsG: 48,
    fatG: 8,
  },
  {
    externalFoodId: "dev-chicken-rice",
    externalProvider: "dev",
    foodName: "Grilled chicken with rice",
    servingDescription: "1 plate",
    calories: 520,
    proteinG: 42,
    carbsG: 55,
    fatG: 12,
  },
  {
    externalFoodId: "dev-dal-roti",
    externalProvider: "dev",
    foodName: "Dal with roti",
    servingDescription: "2 roti + 1 cup dal",
    calories: 410,
    proteinG: 16,
    carbsG: 62,
    fatG: 10,
  },
  {
    externalFoodId: "dev-greek-yogurt",
    externalProvider: "dev",
    foodName: "Greek yogurt with berries",
    servingDescription: "1 cup",
    calories: 180,
    proteinG: 15,
    carbsG: 18,
    fatG: 4,
  },
];

function nutritionixConfigured() {
  return Boolean(process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_API_KEY);
}

function mapNutritionixItem(item: {
  food_name: string;
  nix_item_id?: string;
  serving_qty?: number;
  serving_unit?: string;
  nf_calories?: number;
  nf_protein?: number;
  nf_total_carbohydrate?: number;
  nf_total_fat?: number;
}): FoodSearchResult {
  const qty = item.serving_qty ?? 1;
  const unit = item.serving_unit ?? "serving";
  return {
    externalFoodId: item.nix_item_id ?? item.food_name,
    externalProvider: "nutritionix",
    foodName: item.food_name,
    servingDescription: `${qty} ${unit}`,
    calories: Math.round(item.nf_calories ?? 0),
    proteinG: item.nf_protein ?? 0,
    carbsG: item.nf_total_carbohydrate ?? 0,
    fatG: item.nf_total_fat ?? 0,
  };
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (!nutritionixConfigured()) {
    const lower = q.toLowerCase();
    return DEV_FOODS.filter(
      (f) =>
        f.foodName.toLowerCase().includes(lower) ||
        lower.split(/\s+/).some((word) => f.foodName.toLowerCase().includes(word)),
    );
  }

  const appId = process.env.NUTRITIONIX_APP_ID!;
  const apiKey = process.env.NUTRITIONIX_API_KEY!;

  const res = await fetch("https://trackapi.nutritionix.com/v2/search/instant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-id": appId,
      "x-app-key": apiKey,
    },
    body: JSON.stringify({ query: q }),
  });

  if (!res.ok) {
    throw new Error(`Nutritionix search failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    common?: Array<{
      food_name: string;
      serving_qty?: number;
      serving_unit?: string;
      photo?: { thumb?: string };
      full_nutrients?: Array<{ attr_id: number; value: number }>;
    }>;
    branded?: Array<{
      food_name: string;
      nix_item_id?: string;
      serving_qty?: number;
      serving_unit?: string;
      nf_calories?: number;
    }>;
  };

  const branded = (data.branded ?? []).slice(0, 8).map((item) =>
    mapNutritionixItem({
      food_name: item.food_name,
      nix_item_id: item.nix_item_id,
      serving_qty: item.serving_qty,
      serving_unit: item.serving_unit,
      nf_calories: item.nf_calories,
    }),
  );

  const common = (data.common ?? []).slice(0, 8).map((item) =>
    mapNutritionixItem({
      food_name: item.food_name,
      serving_qty: item.serving_qty,
      serving_unit: item.serving_unit,
    }),
  );

  return [...branded, ...common];
}

export async function lookupBarcode(upc: string): Promise<FoodSearchResult | null> {
  const code = upc.trim();
  if (!code) return null;

  if (!nutritionixConfigured()) {
    return {
      externalFoodId: `dev-barcode-${code}`,
      externalProvider: "dev",
      foodName: `Packaged item (${code})`,
      servingDescription: "1 serving",
      calories: 250,
      proteinG: 10,
      carbsG: 30,
      fatG: 9,
    };
  }

  const appId = process.env.NUTRITIONIX_APP_ID!;
  const apiKey = process.env.NUTRITIONIX_API_KEY!;

  const res = await fetch(`https://trackapi.nutritionix.com/v2/search/item?upc=${encodeURIComponent(code)}`, {
    headers: {
      "x-app-id": appId,
      "x-app-key": apiKey,
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Nutritionix barcode lookup failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    foods?: Array<{
      food_name: string;
      nix_item_id?: string;
      serving_qty?: number;
      serving_unit?: string;
      nf_calories?: number;
      nf_protein?: number;
      nf_total_carbohydrate?: number;
      nf_total_fat?: number;
    }>;
  };

  const item = data.foods?.[0];
  if (!item) return null;
  return mapNutritionixItem(item);
}
