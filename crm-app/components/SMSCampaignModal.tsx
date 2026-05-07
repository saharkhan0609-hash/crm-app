"use client";

import { useState, useEffect } from "react";

interface Lead {
  _id: string;
  name: string;
  phone: string;
}

interface Props {
  onClose: () => void;
  onSent: (result: { campaignName: string; stats: { total: number; sent: number; failed: number } }) => void;
}

const MAX_CHARS = 160;

export default function SMSCampaignModal({ onClose, onSent }: Props) {
  const [allLeads, setAllLeads]     = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [selected, setSelected]     = useState<string[]>([]);
  const [name, setName]             = useState("");
  const [message, setMessage]       = useState("");
  const [error, setError]           = useState("");
  const [sending, setSending]       = useState(false);

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(setAllLeads)
      .catch(() => {});
  }, []);

  const filteredLeads = allLeads.filter(
    l =>
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.phone.includes(leadSearch)
  );

  function toggleLead(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  }

  const charCount = message.length;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Campaign name is required."); return; }
    if (!message.trim()) { setError("Message is required."); return; }
    if (selected.length === 0) { setError("Select at least one lead."); return; }

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/sms/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message, leadIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      onSent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">SMS Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Campaign Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. May Follow-up Blast"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Message
                </label>
                <span className={`text-xs font-medium ${charCount > MAX_CHARS ? "text-amber-600" : "text-gray-400"}`}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Hi {name}, we have an exciting offer for you! Use {name} to personalise each message.`}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Use <code className="bg-gray-100 px-1 rounded">{"{name}"}</code> to insert the lead's name.
              </p>
            </div>

            {/* Lead selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Recipients{" "}
                  <span className="normal-case font-medium text-indigo-600">({selected.length} selected)</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected(filteredLeads.map(l => l._id))} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">All</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={() => setSelected([])} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Search leads..."
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
              />

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                {filteredLeads.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">No leads found</div>
                ) : (
                  filteredLeads.map(lead => (
                    <label
                      key={lead._id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(lead._id)}
                        onChange={() => toggleLead(lead._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-400">{lead.phone}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending…
                </>
              ) : `Send to ${selected.length} Lead${selected.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
