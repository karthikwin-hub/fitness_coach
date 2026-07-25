export const contentBlockSeeds = [
  {
    slug: "welcome-letter",
    category: "welcome_letter" as const,
    title: "Welcome to Abs-Track",
    bodyJson: {
      template:
        "Welcome {{client_name}}! Your personalized program runs {{start_date}} – {{end_date}}. Together we'll work on: {{health_goals}}. Daily check-ins and open communication are the foundation of your success.",
    },
    sortOrder: 0,
  },
  {
    slug: "success-strategies",
    category: "success_strategies" as const,
    title: "Success Strategies",
    bodyJson: {
      items: [
        "Communicate openly with Coach Helna — no question is too small.",
        "Complete daily check-ins: morning weight, sleep hours, meal photo.",
        "Log meals in Abs-Track Nutrition — tap + Add on each meal (breakfast, lunch, dinner, snack).",
        "Plan groceries weekly; prep proteins and vegetables in advance.",
        "Review your plan each Sunday; message Helna if travel or events disrupt routine.",
      ],
    },
    sortOrder: 1,
  },
  {
    slug: "myfitnesspal",
    category: "nutrition_tips" as const,
    title: "Optional: MyFitnessPal",
    bodyJson: {
      items: [
        "Prefer MyFitnessPal? You can keep using it alongside Abs-Track.",
        "Abs-Track Nutrition is your primary log for coach review — log here first when possible.",
        "If you use MFP only, mention it in messages so Helna knows where to look.",
        "Weekly exports from MFP can be shared with your coach on request.",
      ],
    },
    sortOrder: 2,
  },
  {
    slug: "coach-recipes",
    category: "nutrition_tips" as const,
    title: "Quick-Fix Recipes",
    bodyJson: {
      recipes: [
        {
          name: "Greek yogurt bowl",
          proteinG: 22,
          calories: 320,
          tags: ["high-protein", "vegetarian"],
          note: "Add berries and 10 almonds.",
        },
        {
          name: "Grilled chicken + quinoa",
          proteinG: 28,
          calories: 420,
          tags: ["high-protein", "western"],
          note: "Roast vegetables on the side.",
        },
        {
          name: "Lentil dal + small rice",
          proteinG: 18,
          calories: 380,
          tags: ["indian", "vegetarian"],
          note: "Keep rice portion palm-sized.",
        },
        {
          name: "Egg white omelette",
          proteinG: 24,
          calories: 290,
          tags: ["high-protein", "quick"],
          note: "Spinach + wholegrain toast.",
        },
        {
          name: "Paneer tikka salad",
          proteinG: 20,
          calories: 350,
          tags: ["indian", "high-protein"],
          note: "Light dressing; extra greens.",
        },
      ],
    },
    sortOrder: 15,
  },
  {
    slug: "abs-track-diary",
    category: "nutrition_tips" as const,
    title: "Logging Food in Abs-Track",
    bodyJson: {
      items: [
        "Open Nutrition in the app — you'll see today's macro targets from your coach.",
        "Tap + Add on any meal to search foods, enter manually, or snap a meal photo.",
        "Running totals update as you log — aim to stay within your calorie and protein ranges.",
        "Helna reviews your diary during check-ins and plan updates.",
      ],
    },
    sortOrder: 3,
  },
  {
    slug: "week-macros-guide",
    category: "nutrition_tips" as const,
    title: "Understanding Your Macro Targets",
    bodyJson: {
      items: [
        "Calorie range is a target band — not a single number to hit exactly.",
        "Protein is the priority macro — aim for the minimum daily, spread across meals.",
        "Keep carbs at or below your weekly maximum unless coached otherwise.",
        "Healthy fats support hormones and satiety — do not eliminate.",
        "Adjustments happen weekly or fortnightly based on weight trend and energy.",
      ],
    },
    sortOrder: 4,
  },
  {
    slug: "sample-dishes",
    category: "nutrition_tips" as const,
    title: "Sample High-Protein Dishes",
    bodyJson: {
      items: [
        "Greek yogurt + berries + almonds (~22g protein)",
        "Grilled chicken + roasted vegetables + quinoa (~28g protein)",
        "Lentil dal + small brown rice portion (~18g protein)",
        "Egg white omelette + spinach + wholegrain toast (~24g protein)",
        "Paneer tikka + salad (~20g protein)",
        "Target 20–25g protein per main meal.",
      ],
    },
    sortOrder: 4,
  },
  {
    slug: "nutrition-tips-core",
    category: "nutrition_tips" as const,
    title: "Core Nutrition Principles",
    bodyJson: {
      items: [
        "Eat every 3–4 hours to stabilise blood sugar.",
        "Fill half your plate with non-starchy vegetables.",
        "Choose lean protein at every meal.",
        "Limit liquid calories — juices, sweet coffee, alcohol.",
        "Hydrate: 2–3 litres water daily; more on training days.",
        "Eat slowly; stop at 80% fullness.",
      ],
    },
    sortOrder: 5,
  },
  {
    slug: "snack-ideas",
    category: "nutrition_tips" as const,
    title: "Approved Snack Ideas",
    bodyJson: {
      items: [
        "Apple + 10 almonds",
        "Hard-boiled eggs (2)",
        "Cottage cheese + cucumber",
        "Protein shake with water",
        "Roasted chana (1/4 cup)",
        "Rice cakes + peanut butter (1 tsp)",
      ],
    },
    sortOrder: 6,
  },
  {
    slug: "sweet-cravings",
    category: "sweet_cravings" as const,
    title: "Managing Sweet Cravings",
    bodyJson: {
      items: [
        "Pair fruit with protein — never eat fruit alone on an empty stomach.",
        "Dark chocolate 85% — limit to 1–2 squares after meals.",
        "Avoid skipping meals — low blood sugar drives cravings.",
        "Herbal tea after dinner can replace dessert habit.",
        "If craving persists 3 days, message Helna — plan may need adjustment.",
      ],
    },
    sortOrder: 7,
  },
  {
    slug: "health-parameters",
    category: "health_parameters" as const,
    title: "Health Parameters — Hetal Focus",
    bodyJson: {
      items: [
        "Anti-inflammatory: turmeric, ginger, fatty fish, colourful vegetables, limit processed oils.",
        "Osteoporosis support: calcium from dairy or fortified alternatives; weight-bearing exercise.",
        "Iron: lentils, spinach, lean red meat; pair with vitamin C (lemon, bell pepper).",
        "Fiber: 25g+ daily — vegetables, legumes, whole grains.",
        "Bone health: vitamin D from sunlight or supplement as advised by your doctor.",
      ],
    },
    sortOrder: 8,
  },
  {
    slug: "grocery-list",
    category: "grocery_list" as const,
    title: "Weekly Grocery List",
    bodyJson: {
      categories: {
        Produce: [
          "Spinach",
          "Broccoli",
          "Bell peppers",
          "Berries",
          "Bananas",
          "Onions",
          "Tomatoes",
        ],
        Protein: [
          "Eggs",
          "Chicken breast",
          "Greek yogurt",
          "Lentils",
          "Paneer",
          "Fish fillets",
        ],
        Pantry: [
          "Oats",
          "Brown rice",
          "Olive oil",
          "Almonds",
          "Turmeric",
          "Mixed spices",
        ],
        Other: ["Green tea", "Dark chocolate 85%", "Herbal tea"],
      },
    },
    sortOrder: 9,
  },
  {
    slug: "workout-guidelines",
    category: "workout_guidelines" as const,
    title: "Workout Guidelines",
    bodyJson: {
      items: [
        "Superset format: complete 1A → 1B → 1C (→ 1D home circuits), then rest 40–90 seconds.",
        "Engage core on every resistance exercise — brace before each rep.",
        "Warm up 5–8 minutes before resistance work.",
        "Cool down and stretch after every session.",
        "Step goal: 8,000–10,000 steps daily (see plan cover).",
        "Hydrate during training — 500ml water minimum.",
        "Stop if sharp pain occurs; modify range of motion and notify Helna.",
      ],
    },
    sortOrder: 10,
  },
  {
    slug: "stretching-routine",
    category: "stretching_routine" as const,
    title: "Foam Rolling & Stretching (Pre/Post Workout)",
    bodyJson: {
      items: [
        "Foam roll — quads: 30 seconds each leg",
        "Foam roll — IT band: 30 seconds each side",
        "Foam roll — upper back (thoracic): 30 seconds",
        "Hip flexor stretch: 30 seconds each side",
        "Chest doorway stretch: 30 seconds",
        "Hamstring stretch: 30 seconds each leg",
        "Child's pose: 45 seconds",
      ],
    },
    sortOrder: 11,
  },
  {
    slug: "cardio-finisher",
    category: "cardio_finisher" as const,
    title: "Cardio Finisher Options",
    bodyJson: {
      items: [
        "LISS walk or incline treadmill: 20–30 minutes",
        "Stationary bike: 15 minutes moderate pace",
        "5 km walk outdoors (Avinash W1 active rest)",
        "Bodyweight cardio circuit (Shruti home format)",
        "Keep heart rate conversational — you should be able to speak in sentences.",
      ],
    },
    sortOrder: 12,
  },
  {
    slug: "gym-superset-guide",
    category: "workout_guidelines" as const,
    title: "Gym Superset Guide (Avinash W1 Format)",
    bodyJson: {
      items: [
        "1A + 1B + 1C = one superset round. Complete all three before resting.",
        "Rest 60–90 seconds between superset rounds.",
        "Typical session: Warmup → 3–4 supersets → Core → Cardio finisher → Stretch.",
        "Track weights used — aim to progress reps or load each week.",
        "Video links in your plan demonstrate correct form.",
      ],
    },
    sortOrder: 13,
  },
  {
    slug: "home-circuit-guide",
    category: "workout_guidelines" as const,
    title: "Home Circuit Guide (Shruti W21 Format)",
    bodyJson: {
      items: [
        "Up to 6 exercises back-to-back (1A through 1F) with minimal rest.",
        "Rest 60–90 seconds only after completing the full circuit round.",
        "Complete 3 rounds of the circuit for main resistance days.",
        "Companion activity (CA) pattern: alternate strength with short cardio bursts.",
        "No gym required — modify exercises using bodyweight progressions.",
      ],
    },
    sortOrder: 14,
  },
  {
    slug: "daily-checkin-reminder",
    category: "success_strategies" as const,
    title: "Daily Check-In Reminder",
    bodyJson: {
      items: [
        "Morning: weigh yourself (same time, same conditions), log sleep hours.",
        "Meals: photograph lunch and dinner in the app.",
        "Evening: rate energy and soreness (1–10).",
        "Helna reviews flagged meals within 24 hours.",
        "Consistency beats perfection — log even if the meal wasn't ideal.",
      ],
    },
    sortOrder: 15,
  },
];
