"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import DashboardLayout from "@/components/DashboardLayout";
import { Lead } from "@/types/lead";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: "New",           label: "New",           dot: "bg-blue-400",    header: "bg-blue-500/10 border-blue-200" },
  { id: "Contacted",     label: "Contacted",     dot: "bg-violet-400",  header: "bg-violet-500/10 border-violet-200" },
  { id: "Qualified",     label: "Qualified",     dot: "bg-amber-400",   header: "bg-amber-500/10 border-amber-200" },
  { id: "Proposal Sent", label: "Proposal Sent", dot: "bg-orange-400",  header: "bg-orange-500/10 border-orange-200" },
  { id: "Closed Won",    label: "Closed Won",    dot: "bg-emerald-400", header: "bg-emerald-500/10 border-emerald-200" },
  { id: "Closed Lost",   label: "Closed Lost",   dot: "bg-rose-400",    header: "bg-rose-500/10 border-rose-200" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500",   "bg-cyan-500",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pipelineStatus(lead: Lead): ColumnId {
  return (lead.pipelineStatus as ColumnId) ?? "New";
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function CardContent({ lead }: { lead: Lead }) {
  return (
    <>
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className={`w-8 h-8 rounded-full ${avatarColor(lead.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}
        >
          {getInitials(lead.name)}
        </div>
        <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{lead.name}</p>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
          <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {lead.email}
        </p>
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {lead.phone}
        </p>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatDate(lead.createdAt)}</span>
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>
    </>
  );
}

function DraggableCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead._id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-xl border border-gray-200 p-4 cursor-grab active:cursor-grabbing select-none transition-all duration-150 ${
        isDragging
          ? "opacity-40 scale-95 shadow-none"
          : "shadow-sm hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <CardContent lead={lead} />
    </div>
  );
}

function OverlayCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-white rounded-xl border border-indigo-300 shadow-2xl p-4 w-64 rotate-2 opacity-95 cursor-grabbing">
      <CardContent lead={lead} />
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

type ColConfig = (typeof COLUMNS)[number];

function KanbanColumn({ col, leads }: { col: ColConfig; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border mb-3 ${col.header}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          <span className="text-sm font-semibold text-gray-800">{col.label}</span>
        </div>
        <span className="text-xs font-bold text-gray-500 bg-white/70 px-1.5 py-0.5 rounded-full border border-gray-200">
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl min-h-[28rem] p-2.5 space-y-2.5 transition-all duration-150 ${
          isOver
            ? "bg-indigo-50 border-2 border-indigo-400 border-dashed"
            : "bg-gray-100/50 border-2 border-transparent"
        }`}
      >
        {leads.map((lead) => (
          <DraggableCard key={lead._id} lead={lead} />
        ))}

        {leads.length === 0 && (
          <div
            className={`flex flex-col items-center justify-center h-24 rounded-lg transition-colors ${
              isOver ? "text-indigo-400" : "text-gray-300"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-xs font-medium">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Lead[] = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveLeadId(active.id as string);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveLeadId(null);
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as ColumnId;
    const lead = leads.find((l) => l._id === leadId);
    if (!lead || pipelineStatus(lead) === newStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l._id === leadId ? { ...l, pipelineStatus: newStatus } : l))
    );

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStatus: newStatus }),
      });
    } catch {
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, pipelineStatus: lead.pipelineStatus } : l))
      );
    }
  }

  const activeLead = leads.find((l) => l._id === activeLeadId) ?? null;

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Drag leads between stages to update their status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">{leads.length}</span> leads
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-auto p-6 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            <svg className="animate-spin w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading pipeline...
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full pb-4 min-w-max">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  leads={leads.filter((l) => pipelineStatus(l) === col.id)}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
              {activeLead ? <OverlayCard lead={activeLead} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>
    </DashboardLayout>
  );
}
