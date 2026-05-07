"use client";

import { useState } from "react";
import { Lead } from "@/types/lead";

const STATUS_CONFIG: Record<string, string> = {
  New: "bg-blue-100 text-blue-700 border border-blue-200",
  Contacted: "bg-amber-100 text-amber-700 border border-amber-200",
  Qualified: "bg-violet-100 text-violet-700 border border-violet-200",
  Closed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Lost: "bg-red-100 text-red-700 border border-red-200",
};

const STATUSES = ["All", "New", "Contacted", "Qualified", "Closed", "Lost"];

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  leads: Lead[];
  loading: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onView: (lead: Lead) => void;
}

export default function LeadsTable({ leads, loading, onEdit, onDelete, onView }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = leads.filter((lead) => {
    const q = search.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.phone.includes(q);
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">All Leads</h2>
          <p className="text-sm text-gray-400">
            {filtered.length} of {leads.length} leads
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Status" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
          <svg className="animate-spin w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading leads...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No leads found</p>
          <p className="text-xs mt-1">
            {search || statusFilter !== "All"
              ? "Try adjusting your search or filter."
              : "Add your first lead using the button above."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((lead) => {
                const badgeClass =
                  STATUS_CONFIG[lead.status] ?? "bg-gray-100 text-gray-600 border border-gray-200";
                const isPendingDelete = pendingDeleteId === lead._id;

                return (
                  <tr key={lead._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${avatarColor(lead.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                        >
                          {getInitials(lead.name)}
                        </div>
                        <span className="font-semibold text-gray-900">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{lead.email}</td>
                    <td className="px-6 py-4 text-gray-500">{lead.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(lead.createdAt)}</td>
                    <td className="px-6 py-4">
                      {isPendingDelete ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-400">Delete?</span>
                          <button
                            onClick={() => { onDelete(lead._id); setPendingDeleteId(null); }}
                            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onView(lead)}
                            title="View"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onEdit(lead)}
                            title="Edit"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(lead._id)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
