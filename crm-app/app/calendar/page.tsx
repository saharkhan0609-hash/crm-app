"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AppointmentModal from "@/components/AppointmentModal";
import { Appointment } from "@/types/appointment";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-indigo-500",
  completed:  "bg-emerald-500",
  cancelled:  "bg-rose-500",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:  "bg-rose-50 text-rose-700 border-rose-200",
};

// ─── Calendar Page ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>(toYMD(today));

  const [modalMode, setModalMode]             = useState<"add" | "edit" | null>(null);
  const [editingAppt, setEditingAppt]         = useState<Appointment | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?month=${month + 1}&year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setAppointments(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(toYMD(today));
  }

  // ── Grid cells ─────────────────────────────────────────────────────────────

  const daysInMonth  = getDaysInMonth(year, month);
  const startDow     = getFirstDayOfWeek(year, month);
  const totalCells   = Math.ceil((startDow + daysInMonth) / 7) * 7;

  function cellDate(cellIndex: number): string | null {
    const day = cellIndex - startDow + 1;
    if (day < 1 || day > daysInMonth) return null;
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  function appointmentsFor(dateStr: string) {
    return appointments.filter(a => a.date === dateStr);
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  function handleSaved(appt: Appointment) {
    setAppointments(prev => {
      const exists = prev.find(a => a._id === appt._id);
      return exists
        ? prev.map(a => a._id === appt._id ? appt : a)
        : [...prev, appt];
    });
    setModalMode(null);
    setEditingAppt(undefined);
    setSelectedDate(appt.date);
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      setAppointments(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setPendingDeleteId(null);
    }
  }

  const selectedAppts = appointmentsFor(selectedDate).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and manage client appointments.</p>
        </div>
        <button
          onClick={() => { setModalMode("add"); setEditingAppt(undefined); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Appointment
        </button>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-hidden flex gap-0 bg-slate-50">

        {/* ── Calendar grid ── */}
        <section className="flex-1 flex flex-col min-w-0 p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-bold text-gray-900 w-40 text-center">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                <svg className="animate-spin w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading…
              </div>
            ) : (
              <div
                className="flex-1 grid grid-cols-7"
                style={{ gridTemplateRows: `repeat(${totalCells / 7}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dateStr = cellDate(i);
                  const isToday   = dateStr === toYMD(today);
                  const isSelected = dateStr === selectedDate;
                  const appts = dateStr ? appointmentsFor(dateStr) : [];

                  return (
                    <div
                      key={i}
                      onClick={() => dateStr && setSelectedDate(dateStr)}
                      className={`border-b border-r border-gray-100 p-1.5 flex flex-col cursor-pointer transition-colors last:border-r-0 ${
                        dateStr ? "hover:bg-indigo-50/40" : "bg-gray-50/50 cursor-default"
                      } ${isSelected ? "bg-indigo-50" : ""}`}
                    >
                      {dateStr && (
                        <>
                          <span
                            className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 self-end ${
                              isToday
                                ? "bg-indigo-600 text-white"
                                : isSelected
                                ? "text-indigo-700"
                                : "text-gray-700"
                            }`}
                          >
                            {Number(dateStr.slice(8))}
                          </span>
                          <div className="space-y-0.5 overflow-hidden">
                            {appts.slice(0, 2).map(a => (
                              <div
                                key={a._id}
                                className={`text-white text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${STATUS_COLORS[a.status] ?? "bg-indigo-500"}`}
                              >
                                {a.title}
                              </div>
                            ))}
                            {appts.length > 2 && (
                              <div className="text-[10px] text-gray-400 font-medium pl-1">
                                +{appts.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Day panel ── */}
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Selected</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => setModalMode("add")}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              title="Add appointment on this day"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Appointment list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-medium text-gray-400">No appointments</p>
              </div>
            ) : (
              selectedAppts.map(appt => (
                <div key={appt._id} className="bg-gray-50 rounded-xl border border-gray-100 p-3.5">
                  {/* Time bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-8 rounded-full shrink-0 ${STATUS_COLORS[appt.status] ?? "bg-indigo-500"}`} />
                    <div>
                      <p className="text-xs font-bold text-gray-900">{appt.title}</p>
                      <p className="text-xs text-gray-400">{formatTime(appt.startTime)} – {formatTime(appt.endTime)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-2 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {appt.clientName}
                  </p>

                  {appt.notes && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{appt.notes}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[appt.status] ?? ""}`}>
                      {appt.status}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingAppt(appt); setModalMode("edit"); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {pendingDeleteId === appt._id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(appt._id)}
                            className="text-[10px] font-semibold px-2 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            className="text-[10px] font-semibold px-2 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPendingDeleteId(appt._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {/* Modal */}
      {modalMode && (
        <AppointmentModal
          mode={modalMode}
          appointment={editingAppt}
          defaultDate={selectedDate}
          onClose={() => { setModalMode(null); setEditingAppt(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
}
