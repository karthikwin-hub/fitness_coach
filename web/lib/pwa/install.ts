export const DISMISS_STORAGE_KEY = "pwa-install-dismissed";
export const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari && !isStandalone();
}

export function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

export function isInstallDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

export function shouldShowInstallBanner(options?: {
  standalone?: boolean;
  dismissed?: boolean;
  mobile?: boolean;
  hasDeferredPrompt?: boolean;
  iosSafari?: boolean;
}): boolean {
  const standalone = options?.standalone ?? isStandalone();
  if (standalone) return false;

  const dismissed = options?.dismissed ?? isInstallDismissed();
  if (dismissed) return false;

  const mobile = options?.mobile ?? isMobileBrowser();
  if (!mobile) return false;

  const hasDeferredPrompt = options?.hasDeferredPrompt ?? false;
  const iosSafari = options?.iosSafari ?? isIosSafari();
  return hasDeferredPrompt || iosSafari;
}

export function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof (event as BeforeInstallPromptEvent).prompt === "function";
}
