import { z } from "zod";

export const checkInCreateSchema = z.object({
  mealPhotoUrl: z.string().url().optional(),
  weightKg: z.number().min(20).max(300).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  energy: z.number().int().min(1).max(10).optional(),
  soreness: z.number().int().min(1).max(10).optional(),
  _hp: z.string().optional(),
});

export type CheckInCreateInput = z.infer<typeof checkInCreateSchema>;
