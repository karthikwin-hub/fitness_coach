import { MemberNutritionView } from "./member-nutrition-view";

export default function NutritionPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-heading text-2xl">Nutrition</h1>
        <p className="text-sm text-white/60">Macro targets & meal check-ins</p>
      </header>
      <MemberNutritionView />
    </div>
  );
}
