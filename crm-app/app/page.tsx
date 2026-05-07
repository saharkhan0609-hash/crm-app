"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import StatsCards from "@/components/StatsCards";
import LeadsTable from "@/components/LeadsTable";
import LeadModal from "@/components/LeadModal";
import { Lead } from "@/types/lead";

type ModalState = { open: boolean; lead: Lead | null; mode: "add" | "edit" | "view" };

export default function Home() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [modal, setModal] = useState<ModalState>({ open: false, lead: null, mode: "add" });

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Lead[] = await res.json();
      setLeads(data);
      setFetchError("");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const openAdd = () => setModal({ open: true, lead: null, mode: "add" });
  const openEdit = (lead: Lead) => setModal({ open: true, lead, mode: "edit" });
  const openView = (lead: Lead) => setModal({ open: true, lead, mode: "view" });
  const closeModal = () => setModal({ open: false, lead: null, mode: "add" });

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
      fetchLeads();
    } catch {
      // silently refresh — the row will reappear if delete failed
    }
  };

  const stats = {
    total: leads.length,
    newLeads: leads.filter((l) => l.status === "New").length,
    contacted: leads.filter((l) => l.status === "Contacted").length,
    closed: leads.filter((l) => l.status === "Closed").length,
  };

  return (
    <DashboardLayout>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""} — here&apos;s what&apos;s happening today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {session?.user?.name && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {session.user.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {session.user.name}
                </span>
              </div>
            )}

            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all duration-150"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            )}

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Lead
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-8">
          <StatsCards stats={stats} />

          {fetchError && (
            <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {fetchError}
            </div>
          )}

          <div className="mt-6">
            <LeadsTable
              leads={leads}
              loading={loading}
              onEdit={openEdit}
              onDelete={handleDelete}
              onView={openView}
            />
          </div>
        </main>

      {modal.open && (
        <LeadModal
          lead={modal.lead}
          mode={modal.mode}
          onClose={closeModal}
          onSaved={() => { closeModal(); fetchLeads(); }}
        />
      )}
    </DashboardLayout>
  );
}
