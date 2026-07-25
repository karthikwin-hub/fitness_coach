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
  signInWithGoogle: () => Promise<void>;
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

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (!user) {
      setAppUser(null);
      return;
    }
    const token = await user.getIdToken();
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAppUser(await res.json());
    } else {
      setAppUser(null);
    }
  }, []);

  const refreshAppUser = useCallback(async () => {
    await fetchAppUser(firebaseUser);
  }, [firebaseUser, fetchAppUser]);

  useEffect(() => {
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
      await fetchAppUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseConfigured, fetchAppUser]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) throw new Error("Firebase is not configured");
    await signInWithPopup(auth, googleProvider);
  }, []);

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
    setFirebaseUser(null);
    setAppUser(null);
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      appUser,
      loading,
      firebaseConfigured,
      signInWithGoogle,
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
      signInWithGoogle,
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
