"use client";

import { useState, useEffect } from "react";
import { SMSMessage } from "@/types/sms";

interface Lead {
  _id: string;
  name: string;
  phone: string;
}

interface Props {
  onClose: () => void;
  onSent: (msg: SMSMessage) => void;
}

const MAX_CHARS = 160;

export default function SMSComposeModal({ onClose, onSent }: Props) {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [manualPhone, setManualPhone]   = useState("");
  const [useManual, setUseManual]       = useState(false);
  const [body, setBody]           = useState("");
  const [error, setError]         = useState("");
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(setLeads)
      .catch(() => {});
  }, []);

  const filteredLeads = leads.filter(
    l =>
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.phone.includes(leadSearch)
  );

  const charCount = body.length;
  const segments  = Math.ceil(charCount / MAX_CHARS) || 1;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) { setError("Message is required."); return; }
    if (!useManual && !selectedLead) { setError("Select a lead or enter a phone number."); return; }
    if (useManual && !manualPhone.trim()) { setError("Enter a phone number."); return; }

    setSending(true);
    setError("");
    try {
      const payload = useManual
        ? { to: manualPhone.trim(), body }
        : { leadId: selectedLead!._id, body };

      const res  = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Compose SMS</h2>
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

        <form onSubmit={handleSend} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Toggle: lead vs manual */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setUseManual(false)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                !useManual ? "bg-white shadow text-gray-900" : "text-gray-500"
              }`}
            >
              Select Lead
            </button>
            <button
              type="button"
              onClick={() => setUseManual(true)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                useManual ? "bg-white shadow text-gray-900" : "text-gray-500"
              }`}
            >
              Manual Number
            </button>
          </div>

          {useManual ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Phone Number
              </label>
              <input
                type="tel"
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Recipient Lead
              </label>
              {selectedLead ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-green-900">{selectedLead.name}</p>
                    <p className="text-xs text-green-600">{selectedLead.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={leadSearch}
                    onChange={e => setLeadSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent mb-2"
                  />
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {filteredLeads.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-400">No leads found</div>
                    ) : (
                      filteredLeads.map(lead => (
                        <button
                          key={lead._id}
                          type="button"
                          onClick={() => { setSelectedLead(lead); setLeadSearch(""); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-b-0 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
                            {lead.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                            <p className="text-xs text-gray-400">{lead.phone}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Message body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Message
              </label>
              <span className={`text-xs font-medium ${charCount > MAX_CHARS ? "text-amber-600" : "text-gray-400"}`}>
                {charCount}/{MAX_CHARS}
                {segments > 1 && <span className="ml-1 text-amber-500">({segments} segments)</span>}
              </span>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type your SMS message here..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
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
              className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send SMS
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
