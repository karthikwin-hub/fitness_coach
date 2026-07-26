"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import {
  addDays,
  buildDaySlots,
  formatDayLabel,
  formatTimeLabel,
  rangeIsAvailable,
  selectedSlotRange,
  startOfDay,
  SLOT_MINUTES,
  type TimeRange,
} from "@/lib/appointments/slots";

const BOOKING_WINDOW_DAYS = 14;

type Appointment = {
  id: string;
  title: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  status: "booked" | "cancelled" | "completed";
  meetingType: "none" | "in_person" | "google_meet" | "zoom" | "whatsapp";
  location: string | null;
  joinUrl: string | null;
};

type AvailabilityRule = {
  weekday: number;
  startsOn: string;
  endsOn: string | null;
};

type MemberData = {
  coachAssigned: boolean;
  appointments: Appointment[];
  busy: TimeRange[];
  blocks: TimeRange[];
  rules: AvailabilityRule[];
};

export function MemberAppointmentsPage() {
  const getHeaders = useAuthHeaders();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const from = useMemo(() => startOfDay(new Date()), []);
  const to = useMemo(() => addDays(from, BOOKING_WINDOW_DAYS), [from]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch(
      `/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`,
      {},
      getHeaders,
    );
    if (res.ok) {
      const json = await res.json();
      setData({
        coachAssigned: json.coachAssigned ?? false,
        appointments: json.appointments ?? [],
        busy: json.busy ?? [],
        blocks: json.blocks ?? [],
        rules: json.rules ?? [],
      });
    }
    setLoading(false);
  }, [getHeaders, from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dayOptions = useMemo(
    () => Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(from, i)),
    [from],
  );

  const reschedulingAppt = data?.appointments.find((a) => a.id === rescheduleId);

  const slots = useMemo(() => {
    if (!data) return [];
    let busyAll: TimeRange[] = [...data.busy, ...data.blocks];
    // When rescheduling, free up the slot currently held by that appointment.
    if (reschedulingAppt) {
      busyAll = busyAll.filter(
        (b) =>
          !(
            b.startsAt === reschedulingAppt.startsAt &&
            b.endsAt === reschedulingAppt.endsAt
          ),
      );
    }
    const dateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    const selectedKey = dateKey(selectedDay);
    const recurringBlocked = data.rules.some(
      (rule) =>
        rule.weekday === selectedDay.getDay() &&
        rule.startsOn <= selectedKey &&
        (!rule.endsOn || rule.endsOn >= selectedKey),
    );
    const daySlots = buildDaySlots(selectedDay, busyAll);
    return recurringBlocked
      ? daySlots.map((slot) => ({ ...slot, available: false }))
      : daySlots;
  }, [data, selectedDay, reschedulingAppt]);

  const upcoming = (data?.appointments ?? [])
    .filter((a) => a.status !== "cancelled" && new Date(a.endsAt) >= new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  async function book(start: Date, end: Date) {
    setError(null);
    setPending(true);
    if (rescheduleId) {
      const res = await authFetch(
        `/api/appointments/${rescheduleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
          }),
        },
        getHeaders,
      );
      setPending(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not reschedule.");
        return;
      }
      setRescheduleId(null);
      load();
      return;
    }

    const res = await authFetch(
      "/api/appointments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        }),
      },
      getHeaders,
    );
    setPending(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not book that slot.");
      return;
    }
    load();
  }

  function chooseSlot(start: Date) {
    if (!selectedRange) {
      setSelectedRange({
        start,
        end: new Date(start.getTime() + SLOT_MINUTES * 60_000),
      });
      return;
    }
    const range = selectedSlotRange(selectedRange.start, start);
    if (!rangeIsAvailable(range.start, range.end, slots)) {
      setError("That range includes an unavailable time.");
      return;
    }
    setError(null);
    setSelectedRange(range);
  }

  function chooseDuration(minutes: number) {
    if (!selectedRange) return;
    const end = new Date(selectedRange.start.getTime() + minutes * 60_000);
    if (!rangeIsAvailable(selectedRange.start, end, slots)) {
      setError("That duration crosses an unavailable time.");
      return;
    }
    setError(null);
    setSelectedRange({ start: selectedRange.start, end });
  }

  async function cancel(id: string) {
    const res = await authFetch(
      `/api/appointments/${id}`,
      { method: "DELETE" },
      getHeaders,
    );
    if (res.ok) load();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-2xl">Appointments</h1>
        <p className="text-sm text-white/60">
          Book a session with your coach and manage your bookings.
        </p>
      </header>

      {loading ? (
        <p className="text-white/50">Loading…</p>
      ) : !data?.coachAssigned ? (
        <p className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-sm text-white/60">
          You don&apos;t have a coach assigned yet. Once you do, you can book
          sessions here.
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="font-heading text-sm text-white/70">
              Your upcoming sessions
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-white/50">No upcoming sessions.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-3"
                  >
                    <p className="text-sm font-medium">
                      {formatDayLabel(new Date(a.startsAt))}
                    </p>
                    <p className="text-xs text-white/60">
                      {formatTimeLabel(new Date(a.startsAt))} –{" "}
                      {formatTimeLabel(new Date(a.endsAt))}
                      {a.title ? ` · ${a.title}` : ""}
                    </p>
                    {a.location && (
                      <p className="mt-1 text-xs text-white/60">Location: {a.location}</p>
                    )}
                    {a.joinUrl && (
                      <a
                        href={a.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block rounded-lg bg-[var(--brand-diet)] px-3 py-1.5 text-xs font-medium text-black"
                      >
                        Join meeting
                      </a>
                    )}
                    <div className="mt-2 flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setRescheduleId(a.id);
                          setSelectedDay(startOfDay(new Date(a.startsAt)));
                          setSelectedRange(null);
                        }}
                        className="text-[var(--brand-diet)] hover:underline"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => cancel(a.id)}
                        className="text-red-300 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm text-white/70">
                {rescheduleId ? "Pick a new time" : "Book a session"}
              </h2>
              {rescheduleId && (
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleId(null);
                    setError(null);
                  }}
                  className="text-xs text-white/50 hover:underline"
                >
                  Cancel reschedule
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {dayOptions.map((d) => {
                const active =
                  startOfDay(d).getTime() === startOfDay(selectedDay).getTime();
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDay(d);
                      setSelectedRange(null);
                    }}
                    className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${
                      active
                        ? "border-[var(--brand-diet)] bg-[var(--brand-diet)]/20 text-white"
                        : "border-white/15 text-white/70"
                    }`}
                  >
                    {formatDayLabel(d)}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <p className="text-xs text-white/50">
              Select a start time, then another slot to extend the booking.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => {
                const selected =
                  selectedRange &&
                  s.start < selectedRange.end &&
                  selectedRange.start < s.end;
                return (
                <button
                  key={s.start.toISOString()}
                  type="button"
                  disabled={!s.available || pending}
                  onClick={() => chooseSlot(s.start)}
                  className={`rounded-lg border px-2 py-2 text-xs ${
                    selected
                      ? "border-[var(--brand-diet)] bg-[var(--brand-diet)]/30 text-white"
                      : s.available
                      ? "border-white/15 text-white hover:border-[var(--brand-diet)] hover:bg-[var(--brand-diet)]/15"
                      : "cursor-not-allowed border-white/5 text-white/25 line-through"
                  }`}
                >
                  {formatTimeLabel(s.start)}
                </button>
                );
              })}
            </div>
            {selectedRange && (
              <div className="sticky bottom-20 space-y-2 rounded-xl border border-[var(--brand-diet)]/30 bg-[var(--brand-dark-surface)] p-3 shadow-xl">
                <p className="text-sm font-medium">
                  {formatTimeLabel(selectedRange.start)} –{" "}
                  {formatTimeLabel(selectedRange.end)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[30, 60, 90].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => chooseDuration(minutes)}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70"
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRange(null)}
                    className="flex-1 rounded-lg border border-white/15 py-2 text-sm text-white/70"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => book(selectedRange.start, selectedRange.end)}
                    className="flex-1 rounded-lg bg-[var(--brand-diet)] py-2 text-sm font-medium text-black disabled:opacity-50"
                  >
                    {rescheduleId ? "Confirm new time" : "Book selected time"}
                  </button>
                </div>
              </div>
            )}
            {slots.every((s) => !s.available) && (
              <p className="text-xs text-white/50">
                No open slots this day. Try another day.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
