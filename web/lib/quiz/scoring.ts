export type QuizAnswers = {
  goal?: string;
  struggle?: string;
  diet?: string;
  location?: string;
  commitment?: string;
  email?: string;
};

export function scoreIntent(answers: Partial<QuizAnswers>): number {
  let score = 0;
  if (answers.commitment === "high") score += 40;
  if (answers.commitment === "medium") score += 20;
  if (answers.struggle === "consistency" || answers.struggle === "diet") score += 15;
  if (answers.location && answers.location !== "other") score += 15;
  if (answers.goal) score += 10;
  return score;
}

export function routeQuizOutcome(answers: Partial<QuizAnswers>): {
  intentScore: number;
  routedTo: "coaching" | "waitlist";
} {
  const intentScore = scoreIntent(answers);
  const highIntent =
    answers.commitment === "high" ||
    (answers.commitment === "medium" && intentScore >= 50);
  return {
    intentScore,
    routedTo: highIntent ? "coaching" : "waitlist",
  };
}
