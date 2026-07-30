"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  addDays,
  formatDayLabel,
  formatTimeLabel,
  layoutOverlappingEvents,
  SLOT_MINUTES,
  startOfWeek,
  toDateTimeLocal,
  weekDays,
} from "@/lib/appointments/slots";

const HOUR_PX = 56;

type Appointment = {
  id: string;
  coachId: string;
  memberId: string;
  memberName: string;
  title: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  status: "booked" | "cancelled" | "completed";
  meetingType: "none" | "in_person" | "google_meet" | "zoom" | "whatsapp";
  location: string | null;
  joinUrl: string | null;
};

type Block = {
  id: string;
  reason: string | null;
  startsAt: string;
  endsAt: string;
};

type MemberRow = { id: string; displayName: string | null; email: string };
type AvailabilityRule = {
  id: string;
  weekday: number;
  reason: string | null;
  startsOn: string;
  endsOn: string | null;
};
type MeetingDefaults = {
  meetingType: Appointment["meetingType"];
  location: string | null;
  zoomUrl: string | null;
  whatsappUrl: string | null;
};

type Modal =
  | { type: "create"; start: Date; end: Date }
  | { type: "edit"; appt: Appointment }
  | { type: "block"; start: Date; end: Date }
  | { type: "recurring" }
  | { type: "recurring-edit"; rule: AvailabilityRule }
  | null;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function ruleAppliesToDay(rule: AvailabilityRule, day: Date): boolean {
  const key = localDateKey(day);
  return (
    rule.weekday === day.getDay() &&
    rule.startsOn <= key &&
    (!rule.endsOn || rule.endsOn >= key)
  );
}

function dayIndexInWeek(date: Date, weekStart: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - weekStart.getTime()) / 86400_000);
}

function eventGeometry(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startHour = Math.max(
    DAY_START_HOUR,
    start.getHours() + start.getMinutes() / 60,
  );
  const endHour = Math.min(
    DAY_END_HOUR,
    end.getHours() + end.getMinutes() / 60 || DAY_END_HOUR,
  );
  const top = (startHour - DAY_START_HOUR) * HOUR_PX;
  const height = Math.max((endHour - startHour) * HOUR_PX, 28);
  return { top, height };
}

function appointmentLabel(appt: Appointment): string {
  return appt.title?.trim() || appt.memberName;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CoachCalendarView() {
  const getHeaders = useAuthHeaders();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [defaults, setDefaults] = useState<MeetingDefaults>({
    meetingType: "none",
    location: null,
    zoomUrl: null,
    whatsappUrl: null,
  });
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    dayIdx: number;
    startIndex: number;
    endIndex: number;
    blockMode: boolean;
  } | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const slotCount = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;
  const slotIndexes = useMemo(
    () => Array.from({ length: slotCount }, (_, i) => i),
    [slotCount],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch(
      `/api/appointments?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`,
      {},
      getHeaders,
    );
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments ?? []);
      setBlocks(data.blocks ?? []);
      setRules(data.rules ?? []);
      if (data.defaults) setDefaults(data.defaults);
    }
    setLoading(false);
  }, [getHeaders, weekStart, weekEnd]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    authFetch("/api/members", {}, getHeaders)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setMembers(Array.isArray(rows) ? rows : []))
      .catch(() => setMembers([]));
  }, [getHeaders]);

  function slotDate(day: Date, index: number) {
    const start = new Date(day);
    start.setHours(DAY_START_HOUR, index * SLOT_MINUTES, 0, 0);
    return start;
  }

  function openCreate(day: Date, startIndex: number, endIndex = startIndex) {
    const start = slotDate(day, Math.min(startIndex, endIndex));
    const end = new Date(
      slotDate(day, Math.max(startIndex, endIndex)).getTime() +
        SLOT_MINUTES * 60_000,
    );
    setError(null);
    setModal({ type: "create", start, end });
  }

  function openBlock(day: Date, startIndex: number, endIndex = startIndex) {
    const start = slotDate(day, Math.min(startIndex, endIndex));
    const end = new Date(
      slotDate(day, Math.max(startIndex, endIndex)).getTime() +
        SLOT_MINUTES * 60_000,
    );
    setError(null);
    setModal({ type: "block", start, end });
  }

  function openBlockAt(day: Date, hour = DAY_START_HOUR, durationMinutes = 60) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    setError(null);
    setModal({ type: "block", start, end });
  }

  function openBlockNow() {
    const now = new Date();
    const rounded = new Date(now);
    rounded.setMinutes(Math.ceil(rounded.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES, 0, 0);
    const end = new Date(rounded.getTime() + 60 * 60_000);
    setError(null);
    setModal({ type: "block", start: rounded, end });
  }

  const activeAppointments = appointments.filter((a) => a.status !== "cancelled");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
          >
            Next →
          </button>
          <span className="ml-2 text-sm text-white/60">
            {formatDayLabel(days[0])} – {formatDayLabel(days[6])}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal({ type: "recurring" })}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
          >
            Recurring block
          </button>
          <button
            type="button"
            onClick={openBlockNow}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
          >
            + Block time
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  "Block the entire visible week for bookings? You can still adjust start and end times.",
                )
              ) {
                return;
              }
              setError(null);
              setModal({
                type: "block",
                start: new Date(days[0]),
                end: new Date(weekEnd),
              });
            }}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
          >
            Block whole week
          </button>
          <button
            type="button"
            onClick={() => openCreate(days[0], 0)}
            className="rounded-lg bg-[var(--brand-diet)] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90"
          >
            + Appointment
          </button>
        </div>
      </div>

      <p className="text-xs text-white/40">
        Drag on the grid to book. Shift+drag to block time. Click a day name to block one hour.
      </p>

      {rules.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {rules.map((rule) => (
            <span
              key={rule.id}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-white/70"
            >
              Every {WEEKDAY_NAMES[rule.weekday]}
              {rule.reason ? ` · ${rule.reason}` : ""}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setModal({ type: "recurring-edit", rule });
                }}
                className="text-red-300"
                aria-label="Remove recurring block"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-white/50">Loading calendar…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[var(--brand-dark-surface)]">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/10">
              <div />
              {days.map((d) => (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => openBlockAt(d, DAY_START_HOUR, 60)}
                  className="px-2 py-2 text-center text-xs text-white/60 hover:bg-white/5"
                  title="Block one hour on this day"
                >
                  {formatDayLabel(d)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              <div>
                {slotIndexes.map((index) => (
                  <div
                    key={index}
                    style={{ height: HOUR_PX / 2 }}
                    className="pr-1 text-right text-[10px] text-white/40"
                  >
                    {index % 2 === 0
                      ? `${DAY_START_HOUR + index / 2}:00`
                      : ""}
                  </div>
                ))}
              </div>
              {days.map((day, dayIdx) => (
                <div
                  key={day.toISOString()}
                  className="relative border-l border-white/5"
                  style={{ height: slotCount * (HOUR_PX / 2) }}
                  onPointerLeave={() => {
                    if (drag?.dayIdx === dayIdx) setDrag(null);
                  }}
                >
                  {slotIndexes.map((index) => {
                    const selected =
                      drag?.dayIdx === dayIdx &&
                      index >= Math.min(drag.startIndex, drag.endIndex) &&
                      index <= Math.max(drag.startIndex, drag.endIndex);
                    return (
                    <button
                      key={index}
                      type="button"
                      onPointerDown={(e) => {
                        setDrag({
                          dayIdx,
                          startIndex: index,
                          endIndex: index,
                          blockMode: e.shiftKey,
                        });
                      }}
                      onPointerEnter={() =>
                        setDrag((current) =>
                          current?.dayIdx === dayIdx
                            ? { ...current, endIndex: index }
                            : current,
                        )
                      }
                      onPointerUp={() => {
                        if (drag?.dayIdx === dayIdx) {
                          const lo = Math.min(drag.startIndex, drag.endIndex);
                          const hi = Math.max(drag.startIndex, drag.endIndex);
                          if (drag.blockMode) {
                            openBlock(day, lo, hi);
                          } else {
                            openCreate(day, lo, hi);
                          }
                          setDrag(null);
                        } else {
                          openCreate(day, index);
                        }
                      }}
                      style={{ height: HOUR_PX / 2 }}
                      className={`block w-full border-b border-white/5 ${
                        selected
                          ? "bg-[var(--brand-diet)]/25"
                          : "hover:bg-white/5"
                      }`}
                      aria-label={`Create appointment ${formatDayLabel(day)} ${formatTimeLabel(slotDate(day, index))}`}
                    />
                    );
                  })}

                  {(() => {
                    const dayRules = rules.filter((rule) =>
                      ruleAppliesToDay(rule, day),
                    );
                    if (dayRules.length === 0) return null;
                    const rule = dayRules[0];
                    const label = rule.reason ?? "Recurring day off";
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setModal({ type: "recurring-edit", rule });
                        }}
                        title={`${label} — click to manage`}
                        className="absolute inset-0 z-10 cursor-pointer bg-white/10 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.06)_6px,rgba(255,255,255,0.06)_12px)] p-2 text-left text-xs text-white/60 hover:bg-white/15"
                      >
                        {label}
                      </button>
                    );
                  })()}

                  {blocks
                    .filter(
                      (b) => {
                        const dayEnd = addDays(day, 1);
                        return (
                          new Date(b.startsAt) < dayEnd &&
                          day < new Date(b.endsAt)
                        );
                      },
                    )
                    .map((b) => {
                      const g = eventGeometry(b.startsAt, b.endsAt);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setModal({ type: "block", start: new Date(b.startsAt), end: new Date(b.endsAt) })}
                          title={b.reason ?? "Blocked"}
                          style={{ top: g.top, height: g.height }}
                          className="absolute inset-x-0.5 z-10 overflow-hidden rounded-md border border-white/10 bg-white/10 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.06)_6px,rgba(255,255,255,0.06)_12px)] px-1 text-left text-[10px] text-white/60"
                        >
                          Blocked{b.reason ? ` · ${b.reason}` : ""}
                        </button>
                      );
                    })}

                  {(() => {
                    const dayAppointments = activeAppointments.filter(
                      (a) =>
                        dayIndexInWeek(new Date(a.startsAt), weekStart) === dayIdx,
                    );
                    const uniqueAppointments = [
                      ...new Map(dayAppointments.map((a) => [a.id, a])).values(),
                    ];
                    const layouts = layoutOverlappingEvents(uniqueAppointments);
                    const layoutById = new Map(layouts.map((l) => [l.id, l]));

                    return uniqueAppointments.map((a) => {
                      const g = eventGeometry(a.startsAt, a.endsAt);
                      const layout = layoutById.get(a.id) ?? {
                        column: 0,
                        columnCount: 1,
                      };
                      const widthPct = 100 / layout.columnCount;
                      const leftPct = layout.column * widthPct;
                      const showTime = g.height >= 36;

                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setError(null);
                            setModal({ type: "edit", appt: a });
                          }}
                          style={{
                            top: g.top,
                            height: g.height,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                          title={`${appointmentLabel(a)} · ${formatTimeLabel(new Date(a.startsAt))}`}
                          className={`absolute z-20 overflow-hidden rounded-md border px-1 py-0.5 text-left text-[10px] leading-tight ${
                            a.status === "completed"
                              ? "border-white/15 bg-white/10 text-white/60"
                              : "border-[var(--brand-diet)]/40 bg-[var(--brand-diet)]/25 text-white"
                          }`}
                        >
                          <span className="block truncate font-medium">
                            {appointmentLabel(a)}
                          </span>
                          {showTime && (
                            <span className="block truncate text-white/60">
                              {formatTimeLabel(new Date(a.startsAt))}
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal?.type === "create" && (
        <AppointmentForm
          members={members}
          defaults={defaults}
          initialStart={modal.start}
          initialEnd={modal.end}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            const res = await authFetch(
              "/api/appointments",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
              getHeaders,
            );
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error ?? "Could not create appointment");
              return;
            }
            setModal(null);
            load();
          }}
        />
      )}

      {modal?.type === "edit" && (
        <AppointmentForm
          members={members}
          defaults={defaults}
          appt={modal.appt}
          initialStart={new Date(modal.appt.startsAt)}
          initialEnd={new Date(modal.appt.endsAt)}
          error={error}
          onClose={() => setModal(null)}
          onDelete={async () => {
            const res = await authFetch(
              `/api/appointments/${modal.appt.id}`,
              { method: "DELETE" },
              getHeaders,
            );
            if (res.ok) {
              setModal(null);
              load();
            }
          }}
          onSubmit={async (payload) => {
            const res = await authFetch(
              `/api/appointments/${modal.appt.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
              getHeaders,
            );
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error ?? "Could not update appointment");
              return;
            }
            setModal(null);
            load();
          }}
        />
      )}

      {modal?.type === "block" && (
        <BlockForm
          initialStart={modal.start}
          initialEnd={modal.end}
          existing={blocks.find(
            (b) =>
              new Date(b.startsAt).getTime() === modal.start.getTime() &&
              new Date(b.endsAt).getTime() === modal.end.getTime(),
          )}
          error={error}
          onClose={() => setModal(null)}
          onDelete={async (id) => {
            const res = await authFetch(
              `/api/availability-blocks/${id}`,
              { method: "DELETE" },
              getHeaders,
            );
            if (res.ok) {
              setModal(null);
              load();
            }
          }}
          onSubmit={async (payload) => {
            const res = await authFetch(
              "/api/availability-blocks",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
              getHeaders,
            );
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error ?? "Could not block time");
              return;
            }
            setModal(null);
            load();
          }}
        />
      )}

      {modal?.type === "recurring" && (
        <RecurringBlockForm
          error={error}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            const res = await authFetch(
              "/api/availability-rules",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
              getHeaders,
            );
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error ?? "Could not create recurring block");
              return;
            }
            setModal(null);
            load();
          }}
        />
      )}

      {modal?.type === "recurring-edit" && (
        <RecurringBlockEditForm
          rule={modal.rule}
          error={error}
          onClose={() => setModal(null)}
          onDelete={async (id) => {
            const res = await authFetch(
              `/api/availability-rules/${id}`,
              { method: "DELETE" },
              getHeaders,
            );
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error ?? "Could not remove recurring block");
              return;
            }
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-heading text-lg text-white">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm text-white";

function AppointmentForm({
  members,
  defaults,
  appt,
  initialStart,
  initialEnd,
  error,
  onSubmit,
  onDelete,
  onClose,
}: {
  members: MemberRow[];
  defaults: MeetingDefaults;
  appt?: Appointment;
  initialStart: Date;
  initialEnd: Date;
  error: string | null;
  onSubmit: (payload: Record<string, unknown>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [memberId, setMemberId] = useState(appt?.memberId ?? members[0]?.id ?? "");
  const [start, setStart] = useState(toDateTimeLocal(initialStart));
  const [end, setEnd] = useState(toDateTimeLocal(initialEnd));
  const [title, setTitle] = useState(appt?.title ?? "");
  const [notes, setNotes] = useState(appt?.notes ?? "");
  const [status, setStatus] = useState(appt?.status ?? "booked");
  const [meetingType, setMeetingType] = useState<Appointment["meetingType"]>(
    appt?.meetingType ?? defaults.meetingType,
  );
  const [location, setLocation] = useState(
    appt?.location ?? defaults.location ?? "",
  );
  const defaultJoinUrl =
    defaults.meetingType === "zoom"
      ? defaults.zoomUrl
      : defaults.meetingType === "whatsapp"
        ? defaults.whatsappUrl
        : null;
  const [joinUrl, setJoinUrl] = useState(appt?.joinUrl ?? defaultJoinUrl ?? "");
  const [busy, setBusy] = useState(false);

  const isEdit = Boolean(appt);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, unknown> = {
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      title: title || null,
      notes: notes || null,
      meetingType,
      location: meetingType === "in_person" ? location || null : null,
      joinUrl:
        meetingType === "zoom" || meetingType === "whatsapp"
          ? joinUrl || null
          : meetingType === "google_meet"
            ? appt?.joinUrl ?? null
            : null,
    };
    if (isEdit) {
      payload.status = status;
    } else {
      payload.memberId = memberId;
    }
    await onSubmit(payload);
    setBusy(false);
  }

  return (
    <ModalShell title={isEdit ? "Edit appointment" : "New appointment"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {isEdit ? (
          <p className="text-sm text-white/70">{appt!.memberName}</p>
        ) : (
          <label className="block text-xs text-white/50">
            Client
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className={fieldClass}
              required
            >
              {members.length === 0 && <option value="">No clients</option>}
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName ?? m.email}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-white/50">
            Start
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={fieldClass}
              required
            />
          </label>
          <label className="block text-xs text-white/50">
            End
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={fieldClass}
              required
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {[30, 60, 90].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                const nextEnd = new Date(new Date(start).getTime() + minutes * 60_000);
                setEnd(toDateTimeLocal(nextEnd));
              }}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70"
            >
              {minutes} min
            </button>
          ))}
        </div>

        <label className="block text-xs text-white/50">
          Title (optional)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Coaching session"
            className={fieldClass}
          />
        </label>

        <label className="block text-xs text-white/50">
          Meeting type
          <select
            value={meetingType}
            onChange={(e) => {
              const next = e.target.value as Appointment["meetingType"];
              setMeetingType(next);
              if (next === "in_person") setLocation(defaults.location ?? "");
              if (next === "zoom") setJoinUrl(defaults.zoomUrl ?? "");
              if (next === "whatsapp") setJoinUrl(defaults.whatsappUrl ?? "");
            }}
            className={fieldClass}
          >
            <option value="none">No location / link</option>
            <option value="in_person">In person</option>
            <option value="google_meet">Google Meet</option>
            <option value="zoom">Zoom</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>

        {meetingType === "in_person" && (
          <label className="block text-xs text-white/50">
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={fieldClass}
              placeholder="Gym or studio address"
              required
            />
          </label>
        )}

        {(meetingType === "zoom" || meetingType === "whatsapp") && (
          <label className="block text-xs text-white/50">
            Join link
            <input
              type="url"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              className={fieldClass}
              placeholder={
                meetingType === "zoom"
                  ? "https://zoom.us/j/…"
                  : "https://wa.me/…"
              }
              required
            />
          </label>
        )}

        {meetingType === "google_meet" && (
          <p className="text-xs text-white/50">
            A Google Meet link will be created when the coach&apos;s Google
            Calendar is connected.
          </p>
        )}

        <label className="block text-xs text-white/50">
          Notes (optional)
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={fieldClass}
          />
        </label>

        {isEdit && (
          <label className="block text-xs text-white/50">
            Status
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as Appointment["status"])
              }
              className={fieldClass}
            >
              <option value="booked">Booked</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {isEdit && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--brand-diet)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function BlockForm({
  initialStart,
  initialEnd,
  existing,
  error,
  onSubmit,
  onDelete,
  onClose,
}: {
  initialStart: Date;
  initialEnd: Date;
  existing?: Block;
  error: string | null;
  onSubmit: (payload: Record<string, unknown>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [start, setStart] = useState(toDateTimeLocal(initialStart));
  const [end, setEnd] = useState(toDateTimeLocal(initialEnd));
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSubmit({
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      reason: reason || null,
    });
    setBusy(false);
  }

  return (
    <ModalShell
      title={existing ? "Blocked time" : "Block non-working time"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-white/50">
            Start
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={fieldClass}
              required
              disabled={Boolean(existing)}
            />
          </label>
          <label className="block text-xs text-white/50">
            End
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={fieldClass}
              required
              disabled={Boolean(existing)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {[30, 60, 90].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                const nextEnd = new Date(new Date(start).getTime() + minutes * 60_000);
                setEnd(toDateTimeLocal(nextEnd));
              }}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70"
            >
              {minutes} min
            </button>
          ))}
        </div>
        <label className="block text-xs text-white/50">
          Reason (optional)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lunch, admin, day off…"
            className={fieldClass}
            disabled={Boolean(existing)}
          />
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {existing ? (
            <button
              type="button"
              onClick={() => onDelete(existing.id)}
              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Remove block
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70"
            >
              Close
            </button>
            {!existing && (
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Block
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function RecurringBlockEditForm({
  rule,
  error,
  onDelete,
  onClose,
}: {
  rule: AvailabilityRule;
  error: string | null;
  onDelete: (id: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell title="Recurring day off" onClose={onClose}>
      <div className="space-y-3 text-sm text-white/80">
        <p>
          Every <span className="text-white">{WEEKDAY_NAMES[rule.weekday]}</span>
        </p>
        <p className="text-xs text-white/50">
          From {rule.startsOn}
          {rule.endsOn ? ` until ${rule.endsOn}` : " (no end date)"}
        </p>
        {rule.reason && (
          <p className="text-xs text-white/50">Reason: {rule.reason}</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDelete(rule.id);
              setBusy(false);
            }}
            className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            Remove recurring block
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function RecurringBlockForm({
  error,
  onSubmit,
  onClose,
}: {
  error: string | null;
  onSubmit: (payload: Record<string, unknown>) => void | Promise<void>;
  onClose: () => void;
}) {
  const [weekday, setWeekday] = useState(0);
  const [startsOn, setStartsOn] = useState(localDateKey(new Date()));
  const [endsOn, setEndsOn] = useState("");
  const [reason, setReason] = useState("Day off");
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell title="Recurring day off" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          await onSubmit({
            weekday,
            startsOn,
            endsOn: endsOn || null,
            reason: reason || null,
          });
          setBusy(false);
        }}
      >
        <label className="block text-xs text-white/50">
          Repeat every
          <select
            value={weekday}
            onChange={(event) => setWeekday(Number(event.target.value))}
            className={fieldClass}
          >
            {WEEKDAY_NAMES.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-white/50">
            Starting
            <input
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              className={fieldClass}
              required
            />
          </label>
          <label className="block text-xs text-white/50">
            Until (optional)
            <input
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="block text-xs text-white/50">
          Reason
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={fieldClass}
          />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            Save recurring block
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
