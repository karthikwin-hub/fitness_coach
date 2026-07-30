"use client";

import { useCallback, useEffect, useState } from "react";
import { Share2, Smartphone, X } from "lucide-react";
import {
  type BeforeInstallPromptEvent,
  dismissInstallPrompt,
  isBeforeInstallPromptEvent,
  isInstallDismissed,
  isIosSafari,
  isStandalone,
  shouldShowInstallBanner,
} from "@/lib/pwa/install";

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  const refreshVisibility = useCallback(() => {
    setVisible(
      shouldShowInstallBanner({
        hasDeferredPrompt: deferredPrompt !== null,
        iosSafari: isIosSafari(),
      }),
    );
    setIosMode(isIosSafari());
  }, [deferredPrompt]);

  useEffect(() => {
    if (isStandalone() || isInstallDismissed()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    refreshVisibility();

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [refreshVisibility]);

  useEffect(() => {
    refreshVisibility();
  }, [deferredPrompt, refreshVisibility]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
      refreshVisibility();
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Install app"
      className="border-b border-[var(--brand-diet)]/30 bg-[var(--brand-dark-surface)] px-4 py-3"
    >
      <div className="mx-auto flex max-w-lg items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-[var(--brand-diet)]/15 p-2 text-[var(--brand-diet)]">
          {iosMode ? <Share2 className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Install ABS-TRACK</p>
          {iosMode ? (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Tap <span className="font-medium text-white">Share</span>, then{" "}
              <span className="font-medium text-white">Add to Home Screen</span> to save the app
              on your iPhone.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Add ABS-TRACK to your home screen for quick access to coaching on the go.
            </p>
          )}
          {!iosMode && deferredPrompt ? (
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={installing}
              className="mt-2 rounded-lg bg-[var(--brand-diet)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-dark)] disabled:opacity-60"
            >
              {installing ? "Installing…" : "Install app"}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded p-1 text-white/50 hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
