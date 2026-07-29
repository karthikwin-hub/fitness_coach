"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getClientAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  clearDevPersonaStorage,
  devPersonaToAppUser,
  DEV_PERSONA_BY_ID,
  readStoredDevPersonaId,
  storeDevPersonaId,
  type DevPersonaId,
} from "@/lib/auth/dev-personas";
import { isDevAuthEnabled } from "@/lib/auth/dev-auth-enabled";
import {
  clearDemoAuthToken,
  DEMO_COACH_EMAIL,
  DEMO_MEMBER_EMAIL,
  isClientDemoLoginEnabled,
  readDemoAuthToken,
  storeDemoAuthToken,
} from "@/lib/auth/demo-login-shared";

export type AppUser = {
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: "platform_admin" | "coach" | "member";
  tenantSlug: string;
};

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  firebaseConfigured: boolean;
  demoLoginEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemoCoach: (email: string) => Promise<void>;
  signInAsDemoUser: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
  switchDevPersona: (personaId: DevPersonaId) => void;
  /** @deprecated use switchDevPersona */
  switchDevRole: (role: "coach" | "member") => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getDevAppUser(): AppUser {
  const persona = DEV_PERSONA_BY_ID[readStoredDevPersonaId()];
  return devPersonaToAppUser(persona);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const firebaseConfigured = isFirebaseConfigured();
  const demoLoginEnabled = isClientDemoLoginEnabled();

  const fetchAppUserWithToken = useCallback(async (token: string) => {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAppUser(await res.json());
      return true;
    }
    setAppUser(null);
    return false;
  }, []);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (!user) {
      setAppUser(null);
      return;
    }
    const token = await user.getIdToken();
    await fetchAppUserWithToken(token);
  }, [fetchAppUserWithToken]);

  const refreshAppUser = useCallback(async () => {
    if (firebaseUser) {
      await fetchAppUser(firebaseUser);
      return;
    }
    const demoToken = readDemoAuthToken();
    if (demoToken) {
      await fetchAppUserWithToken(demoToken);
    }
  }, [firebaseUser, fetchAppUser, fetchAppUserWithToken]);

  useEffect(() => {
    async function bootstrap() {
      const demoToken = readDemoAuthToken();
      if (demoToken && demoLoginEnabled) {
        const ok = await fetchAppUserWithToken(demoToken);
        if (ok) {
          setLoading(false);
          return;
        }
        clearDemoAuthToken();
      }

      if (!firebaseConfigured) {
        if (isDevAuthEnabled()) {
          setAppUser(getDevAppUser());
        }
        setLoading(false);
        return;
      }

      const auth = getClientAuth();
      if (!auth) {
        setLoading(false);
        return;
      }

      const unsub = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);
        if (user) {
          clearDemoAuthToken();
          await fetchAppUser(user);
        } else if (!readDemoAuthToken()) {
          setAppUser(null);
        }
        setLoading(false);
      });
      return unsub;
    }

    let unsub: (() => void) | undefined;
    void bootstrap().then((cleanup) => {
      unsub = cleanup;
    });
    return () => unsub?.();
  }, [firebaseConfigured, demoLoginEnabled, fetchAppUser, fetchAppUserWithToken]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) throw new Error("Firebase is not configured");
    clearDemoAuthToken();
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInAsDemoUser = useCallback(
    async (email: string) => {
      const auth = getClientAuth();
      if (auth) {
        try {
          await firebaseSignOut(auth);
        } catch {
          // Continue with demo login even if Firebase sign-out fails.
        }
      }
      clearDevPersonaStorage();

      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Demo sign-in failed");
      }

      const payload = (await res.json()) as {
        token: string;
        user: AppUser;
      };
      storeDemoAuthToken(payload.token);
      setFirebaseUser(null);
      setAppUser(payload.user);
    },
    [],
  );

  const signInAsDemoCoach = signInAsDemoUser;

  const switchDevPersona = useCallback((personaId: DevPersonaId) => {
    storeDevPersonaId(personaId);
    setAppUser(devPersonaToAppUser(DEV_PERSONA_BY_ID[personaId]));
  }, []);

  const switchDevRole = useCallback(
    (role: "coach" | "member") => {
      switchDevPersona(role === "member" ? "member-demo" : "coach");
    },
    [switchDevPersona],
  );

  const signOut = useCallback(async () => {
    const auth = getClientAuth();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch {
        // Still clear local session if Firebase sign-out fails
      }
    }
    clearDevPersonaStorage();
    clearDemoAuthToken();
    setFirebaseUser(null);
    setAppUser(null);
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      appUser,
      loading,
      firebaseConfigured,
      demoLoginEnabled,
      signInWithGoogle,
      signInAsDemoCoach,
      signInAsDemoUser,
      signOut,
      refreshAppUser,
      switchDevPersona,
      switchDevRole,
    }),
    [
      firebaseUser,
      appUser,
      loading,
      firebaseConfigured,
      demoLoginEnabled,
      signInWithGoogle,
      signInAsDemoCoach,
      signInAsDemoUser,
      signOut,
      refreshAppUser,
      switchDevPersona,
      switchDevRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
