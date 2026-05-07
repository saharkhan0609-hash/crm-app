"use client";

import { useState, useEffect } from "react";
import { Lead } from "@/types/lead";

interface Props {
  lead: Lead | null;
  mode: "add" | "edit" | "view";
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Closed", "Lost"];

const MODE_LABELS = {
  add: { title: "Add New Lead", subtitle: "Fill in the details to create a new lead." },
  edit: { title: "Edit Lead", subtitle: "Update the lead information below." },
  view: { title: "Lead Details", subtitle: "Viewing lead information." },
};

export default function LeadModal({ lead, mode, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "New" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lead) {
      setForm({ name: lead.name, email: lead.email, phone: lead.phone, status: lead.status });
    }
  }, [lead]);

  const isReadOnly = mode === "view";
  const { title, subtitle } = MODE_LABELS[mode];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;
    setError("");
    setSubmitting(true);
    try {
      const url = lead ? `/api/leads/${lead._id}` : "/api/leads";
      const method = lead ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (readonly: boolean) =>
    `w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition ${
      readonly
        ? "bg-gray-50 border-gray-200 text-gray-700 cursor-default"
        : "border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-4 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required={!isReadOnly}
                readOnly={isReadOnly}
                placeholder="John Smith"
                className={inputClass(isReadOnly)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required={!isReadOnly}
                readOnly={isReadOnly}
                placeholder="john@example.com"
                className={inputClass(isReadOnly)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required={!isReadOnly}
                readOnly={isReadOnly}
                placeholder="+1 (555) 000-0000"
                className={inputClass(isReadOnly)}
              />
            </div>

            {mode !== "add" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Status
                </label>
                {isReadOnly ? (
                  <input
                    type="text"
                    value={form.status}
                    readOnly
                    className={inputClass(true)}
                  />
                ) : (
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isReadOnly ? "Close" : "Cancel"}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors shadow-sm"
              >
                {submitting ? "Saving..." : mode === "add" ? "Create Lead" : "Save Changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
