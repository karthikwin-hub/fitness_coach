export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodEntrySource = "search" | "manual" | "photo_ai";

export type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type FoodSearchResult = {
  externalFoodId: string;
  externalProvider: string;
  foodName: string;
  servingDescription: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type DiaryEntryDto = {
  id: string;
  logDate: string;
  mealType: MealType;
  source: FoodEntrySource;
  foodName: string;
  externalFoodId: string | null;
  externalProvider: string | null;
  servingDescription: string | null;
  quantity: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  photoUrl: string | null;
  createdAt: string;
};

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
