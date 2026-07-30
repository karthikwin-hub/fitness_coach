import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DISMISS_STORAGE_KEY,
  DISMISS_TTL_MS,
  dismissInstallPrompt,
  isInstallDismissed,
  isIosSafari,
  isMobileBrowser,
  isStandalone,
  shouldShowInstallBanner,
} from "./install";

type BrowserMocks = {
  standaloneDisplay: boolean;
  iosStandalone: boolean;
  userAgent: string;
  storage: Record<string, string>;
};

function installBrowserMocks(mocks: BrowserMocks) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mocks.storage[key] ?? null,
    setItem: (key: string, value: string) => {
      mocks.storage[key] = value;
    },
    removeItem: (key: string) => {
      delete mocks.storage[key];
    },
    clear: () => {
      for (const key of Object.keys(mocks.storage)) {
        delete mocks.storage[key];
      }
    },
  });

  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: query === "(display-mode: standalone)" && mocks.standaloneDisplay,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
    navigator: {
      userAgent: mocks.userAgent,
      standalone: mocks.iosStandalone,
    },
  });
}

describe("isStandalone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when display-mode is standalone", () => {
    installBrowserMocks({
      standaloneDisplay: true,
      iosStandalone: false,
      userAgent: "",
      storage: {},
    });
    expect(isStandalone()).toBe(true);
  });

  it("returns true on iOS standalone navigator flag", () => {
    installBrowserMocks({
      standaloneDisplay: false,
      iosStandalone: true,
      userAgent: "",
      storage: {},
    });
    expect(isStandalone()).toBe(true);
  });

  it("returns false in normal browser mode", () => {
    installBrowserMocks({
      standaloneDisplay: false,
      iosStandalone: false,
      userAgent: "",
      storage: {},
    });
    expect(isStandalone()).toBe(false);
  });
});

describe("isIosSafari", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects iPhone Safari", () => {
    installBrowserMocks({
      standaloneDisplay: false,
      iosStandalone: false,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      storage: {},
    });
    expect(isIosSafari()).toBe(true);
  });

  it("returns false for Chrome on iOS", () => {
    installBrowserMocks({
      standaloneDisplay: false,
      iosStandalone: false,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
      storage: {},
    });
    expect(isIosSafari()).toBe(false);
  });
});

describe("isMobileBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects Android user agents", () => {
    installBrowserMocks({
      standaloneDisplay: false,
      iosStandalone: false,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      storage: {},
    });
    expect(isMobileBrowser()).toBe(true);
  });

  it("returns false for desktop user agents", () => {
    installBrowserMocks({
      standaloneDisplay: false,
      iosStandalone: false,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      storage: {},
    });
    expect(isMobileBrowser()).toBe(false);
  });
});

describe("install dismiss storage", () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
    installBrowserMocks({
      standaloneDisplay: false,
      iosStandalone: false,
      userAgent: "",
      storage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and reads dismiss timestamp", () => {
    expect(isInstallDismissed()).toBe(false);
    dismissInstallPrompt();
    expect(isInstallDismissed()).toBe(true);
  });

  it("expires dismiss after TTL", () => {
    storage[DISMISS_STORAGE_KEY] = String(Date.now() - DISMISS_TTL_MS - 1);
    expect(isInstallDismissed()).toBe(false);
  });
});

describe("shouldShowInstallBanner", () => {
  it("shows on mobile iOS Safari when not dismissed", () => {
    expect(
      shouldShowInstallBanner({
        standalone: false,
        dismissed: false,
        mobile: true,
        hasDeferredPrompt: false,
        iosSafari: true,
      }),
    ).toBe(true);
  });

  it("shows on Android when deferred prompt is available", () => {
    expect(
      shouldShowInstallBanner({
        standalone: false,
        dismissed: false,
        mobile: true,
        hasDeferredPrompt: true,
        iosSafari: false,
      }),
    ).toBe(true);
  });

  it("hides when already installed", () => {
    expect(
      shouldShowInstallBanner({
        standalone: true,
        dismissed: false,
        mobile: true,
        hasDeferredPrompt: true,
        iosSafari: true,
      }),
    ).toBe(false);
  });

  it("hides on desktop without mobile browser", () => {
    expect(
      shouldShowInstallBanner({
        standalone: false,
        dismissed: false,
        mobile: false,
        hasDeferredPrompt: true,
        iosSafari: false,
      }),
    ).toBe(false);
  });
});
