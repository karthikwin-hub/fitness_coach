const STORAGE_KEY = "philosophySlide";

export function readPhilosophySlide(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function storePhilosophySlide(index: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(index));
}

export function clearPhilosophyProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
