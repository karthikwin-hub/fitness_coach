"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "pilot-timer-start";

export function usePilotTimer(memberId: string) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number | null>(null);

  const storageKey = `${STORAGE_KEY}-${memberId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      startRef.current = Number(saved);
      setRunning(true);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!running || !startRef.current) return;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = useCallback(() => {
    startRef.current = Date.now();
    localStorage.setItem(storageKey, String(startRef.current));
    setRunning(true);
    setElapsed(0);
  }, [storageKey]);

  const stop = useCallback(() => {
    const duration = startRef.current
      ? Math.floor((Date.now() - startRef.current) / 1000)
      : elapsed;
    localStorage.removeItem(storageKey);
    startRef.current = null;
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    return duration;
  }, [elapsed, storageKey]);

  const format = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const underTarget = elapsed <= 300;

  return { elapsed, running, start, stop, format, underTarget, targetSeconds: 300 };
}
