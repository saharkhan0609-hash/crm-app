"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { LeadScore, GeneratedContent, SequenceStep, ChatMessage } from "@/types/ai";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  pipelineStatus: string;
  welcomeEmailSent: boolean;
  followUpSent: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-500" };
  if (s >= 60) return { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    bar: "bg-blue-500"    };
  if (s >= 40) return { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   bar: "bg-amber-500"   };
  return               { bg: "bg-rose-100",   text: "text-rose-700",    border: "border-rose-200",    bar: "bg-rose-500"    };
}

const URGENCY_BADGE: Record<string, string> = {
  low:    "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-rose-100 text-rose-700",
};

const PIPELINE_DOT: Record<string, string> = {
  "New":           "bg-blue-400",
  "Contacted":     "bg-violet-400",
  "Qualified":     "bg-amber-400",
  "Proposal Sent": "bg-orange-400",
  "Closed Won":    "bg-emerald-400",
  "Closed Lost":   "bg-rose-400",
};

type Tab = "chat" | "generate" | "sequence";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIPage() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadSearch, setLeadSearch]     = useState("");
  const [scores, setScores]             = useState<Record<string, LeadScore>>({});
  const [scoring, setScoring]           = useState<string | null>(null);
  const [tab, setTab]                   = useState<Tab>("chat");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Select a lead from the list, then ask me to draft messages, score them, plan follow-ups, or build a sequence — or just chat freely about your sales strategy." },
  ]);
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef               = useRef<HTMLDivElement>(null);

  // Generate state
  const [genType, setGenType]       = useState<"email" | "sms" | "followup_plan">("email");
  const [genTone, setGenTone]       = useState("professional");
  const [genContext, setGenContext] = useState("");
  const [generated, setGenerated]   = useState<GeneratedContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]         = useState(false);

  // Sequence state
  const [seqSteps, setSeqSteps]     = useState(5);
  const [seqType, setSeqType]       = useState<"email" | "sms" | "mixed">("mixed");
  const [seqGoal, setSeqGoal]       = useState<"nurture" | "close" | "reactivate">("nurture");
  const [sequence, setSequence]     = useState<{ sequence: SequenceStep[]; strategy: string; leadName: string } | null>(null);
  const [buildingSeq, setBuildingSeq] = useState(false);

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(data => { setLeads(data); setLoadingLeads(false); })
      .catch(() => setLoadingLeads(false));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.pipelineStatus.toLowerCase().includes(leadSearch.toLowerCase())
  );

  // ── Score a lead ────────────────────────────────────────────────────────────

  async function scoreLead(lead: Lead) {
    setScoring(lead._id);
    try {
      const res  = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScores(prev => ({ ...prev, [lead._id]: data }));
    } catch (err) {
      console.error("Score error:", err);
    } finally {
      setScoring(null);
    }
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────

  async function sendChat(text?: string) {
    const userText = (text ?? chatInput).trim();
    if (!userText || chatLoading) return;
    setChatInput("");

    const history: ChatMessage[] = [...chatMessages, { role: "user", content: userText }];
    setChatMessages(history);
    setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, leadId: selectedLead?._id }),
      });
      if (!res.body) throw new Error("No stream");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setChatMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: full };
          return next;
        });
      }
    } catch {
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "⚠️ Error. Ensure ANTHROPIC_API_KEY is set." };
        return next;
      });
    } finally {
      setChatLoading(false);
    }
  }

  // ── Generate ─────────────────────────────────────────────────────────────────

  async function generateContent() {
    if (!selectedLead) return;
    setGenerating(true);
    setGenerated(null);
    try {
      const res  = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead._id,
          type: genType,
          tone: genTone,
          context: genContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGenerated(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Sequence ──────────────────────────────────────────────────────────────────

  async function buildSequence() {
    if (!selectedLead) return;
    setBuildingSeq(true);
    setSequence(null);
    try {
      const res  = await fetch("/api/ai/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead._id, steps: seqSteps, type: seqType, goal: seqGoal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSequence(data);
    } catch (err) {
      console.error(err);
    } finally {
      setBuildingSeq(false);
    }
  }

  const selectedScore = selectedLead ? scores[selectedLead._id] : null;

  return (
    <DashboardLayout>
      <header className="bg-white border-b border-gray-200 px-8 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Command Center</h1>
            <p className="text-sm text-gray-500 mt-0.5">Score leads, generate messages, and plan sequences with Claude AI.</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-semibold text-violet-700">Powered by Claude</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex bg-slate-50">

        {/* ── Left: Lead Intelligence ── */}
        <aside className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Lead Intelligence</p>
            <input
              type="text"
              placeholder="Search leads..."
              value={leadSearch}
              onChange={e => setLeadSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingLeads ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No leads</div>
            ) : (
              filteredLeads.map(lead => {
                const s = scores[lead._id];
                const c = s ? scoreColor(s.score) : null;
                const isSelected = selectedLead?._id === lead._id;
                return (
                  <div
                    key={lead._id}
                    onClick={() => setSelectedLead(lead)}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-violet-50 border-l-2 border-l-violet-500" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {lead.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{lead.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PIPELINE_DOT[lead.pipelineStatus] ?? "bg-gray-300"}`} />
                            <span className="text-[10px] text-gray-400 truncate">{lead.pipelineStatus}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score badge */}
                      {s && c ? (
                        <div className={`shrink-0 flex flex-col items-center px-2 py-1 rounded-lg border ${c.bg} ${c.border}`}>
                          <span className={`text-sm font-extrabold ${c.text} leading-none`}>{s.score}</span>
                          <span className={`text-[9px] font-bold ${c.text}`}>{s.grade}</span>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); scoreLead(lead); }}
                          disabled={scoring === lead._id}
                          className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
                        >
                          {scoring === lead._id ? (
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : "Score"}
                        </button>
                      )}
                    </div>

                    {/* Score bar */}
                    {s && c && (
                      <div className="h-1 rounded-full bg-gray-100 overflow-hidden mt-1">
                        <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${s.score}%` }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right: AI Tools ── */}
        <section className="flex-1 flex flex-col overflow-hidden">

          {/* Selected lead context bar */}
          {selectedLead ? (
            <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {selectedLead.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{selectedLead.name}</p>
                <p className="text-xs text-gray-400">{selectedLead.email} · {selectedLead.pipelineStatus}</p>
              </div>
              {selectedScore && (
                <>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${scoreColor(selectedScore.score).bg} ${scoreColor(selectedScore.score).border}`}>
                    <span className={`text-lg font-extrabold ${scoreColor(selectedScore.score).text}`}>{selectedScore.score}</span>
                    <div>
                      <p className={`text-xs font-bold ${scoreColor(selectedScore.score).text} leading-none`}>{selectedScore.grade}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">AI Score</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${URGENCY_BADGE[selectedScore.urgency]}`}>
                    {selectedScore.urgency} urgency
                  </span>
                </>
              )}
              {!selectedScore && (
                <button
                  onClick={() => scoreLead(selectedLead)}
                  disabled={scoring === selectedLead._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
                >
                  {scoring === selectedLead._id ? (
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : "🎯"} Score This Lead
                </button>
              )}
            </div>
          ) : (
            <div className="bg-violet-50 border-b border-violet-100 px-6 py-2.5 shrink-0">
              <p className="text-xs text-violet-600 font-medium">← Select a lead from the list to enable context-aware AI tools</p>
            </div>
          )}

          {/* Score insights panel */}
          {selectedScore && (
            <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Analysis</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{selectedScore.reasoning}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedScore.insights.map((ins, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ins}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-violet-50 rounded-xl border border-violet-100 p-3">
                  <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide mb-1">Recommended Action</p>
                  <p className="text-xs text-violet-900 font-medium leading-relaxed">{selectedScore.nextAction}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white border-b border-gray-100 px-6 shrink-0">
            <div className="flex gap-0">
              {(["chat", "generate", "sequence"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 capitalize transition-colors mr-2 ${
                    tab === t
                      ? "border-violet-500 text-violet-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "chat" && "💬 "}{t === "generate" && "✨ "}{t === "sequence" && "📋 "}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* ── Chat tab ── */}
            {tab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm">
                          AI
                        </div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                      }`}>
                        {msg.content || (
                          <span className="flex gap-1 items-center h-4">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
                <div className="px-6 py-4 bg-white border-t border-gray-100 shrink-0">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      placeholder={selectedLead ? `Ask anything about ${selectedLead.name}…` : "Ask me anything about your CRM strategy…"}
                      rows={2}
                      className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => sendChat()}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-40 transition-colors shadow-sm"
                    >
                      Send
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Shift+Enter for new line · Claude AI</p>
                </div>
              </>
            )}

            {/* ── Generate tab ── */}
            {tab === "generate" && (
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedLead && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl mb-5">
                    Select a lead from the list to generate personalised content.
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {/* Type */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Type</p>
                    <div className="flex flex-col gap-1.5">
                      {([["email", "📧 Email"], ["sms", "💬 SMS"], ["followup_plan", "🗺️ Action Plan"]] as const).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setGenType(v)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${genType === v ? "bg-violet-600 text-white border-violet-600" : "bg-white border-gray-200 text-gray-700 hover:border-violet-300"}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Tone */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Tone</p>
                    <div className="flex flex-col gap-1.5">
                      {(["professional", "friendly", "casual", "urgent"] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setGenTone(t)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${genTone === t ? "bg-violet-600 text-white border-violet-600" : "bg-white border-gray-200 text-gray-700 hover:border-violet-300"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Context */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Extra Context</p>
                    <textarea
                      value={genContext}
                      onChange={e => setGenContext(e.target.value)}
                      placeholder="Any specific angle, offer, or context to include..."
                      rows={5}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={generateContent}
                  disabled={!selectedLead || generating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-sm mb-5"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generating…
                    </>
                  ) : "✨ Generate"}
                </button>

                {generated && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-100">
                      <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">Generated Output</span>
                      <button
                        onClick={() => {
                          const text = "subject" in generated
                            ? `Subject: ${(generated as { subject: string }).subject}\n\n${(generated as { body: string }).body}`
                            : "body" in generated
                            ? (generated as { body: string }).body
                            : (generated as { nextAction: string; suggestions: string[] }).nextAction;
                          copyToClipboard(text);
                        }}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1"
                      >
                        {copied ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="p-5 space-y-3">
                      {"subject" in generated && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Subject</p>
                          <p className="text-sm font-semibold text-gray-900">{(generated as { subject: string }).subject}</p>
                        </div>
                      )}
                      {"body" in generated && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                            {"subject" in generated ? "Body" : "Message"}
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{(generated as { body: string }).body}</p>
                        </div>
                      )}
                      {"nextAction" in generated && (
                        <>
                          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                            <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide mb-1">Next Action</p>
                            <p className="text-sm font-bold text-violet-900">{(generated as { nextAction: string }).nextAction}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggestions</p>
                            {(generated as { suggestions: string[] }).suggestions?.map((s, i) => (
                              <div key={i} className="flex items-start gap-2 mb-2">
                                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                <p className="text-sm text-gray-700">{s}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Sequence tab ── */}
            {tab === "sequence" && (
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedLead && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl mb-5">
                    Select a lead from the list to generate a personalised sequence.
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Steps</p>
                    <div className="flex gap-2 flex-wrap">
                      {[3, 5, 7].map(n => (
                        <button key={n} onClick={() => setSeqSteps(n)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${seqSteps === n ? "bg-violet-600 text-white border-violet-600" : "bg-white border-gray-200 text-gray-700 hover:border-violet-300"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Channel</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["email", "sms", "mixed"] as const).map(t => (
                        <button key={t} onClick={() => setSeqType(t)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold capitalize transition-colors ${seqType === t ? "bg-violet-600 text-white border-violet-600" : "bg-white border-gray-200 text-gray-700 hover:border-violet-300"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Goal</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["nurture", "close", "reactivate"] as const).map(g => (
                        <button key={g} onClick={() => setSeqGoal(g)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold capitalize transition-colors ${seqGoal === g ? "bg-violet-600 text-white border-violet-600" : "bg-white border-gray-200 text-gray-700 hover:border-violet-300"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={buildSequence}
                  disabled={!selectedLead || buildingSeq}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-sm mb-6"
                >
                  {buildingSeq ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Building Sequence…
                    </>
                  ) : "📋 Build Sequence"}
                </button>

                {sequence && (
                  <div className="space-y-4">
                    {sequence.strategy && (
                      <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-3">
                        <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1">Strategy</p>
                        <p className="text-sm text-violet-900 leading-relaxed">{sequence.strategy}</p>
                      </div>
                    )}
                    <div className="relative">
                      <div className="absolute left-[22px] top-5 bottom-5 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        {sequence.sequence.map((step, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-11 h-11 rounded-full bg-white border-2 border-violet-300 flex flex-col items-center justify-center shrink-0 z-10 shadow-sm">
                              <span className="text-[9px] text-gray-400 font-semibold leading-none">Day</span>
                              <span className="text-sm font-extrabold text-violet-700 leading-none">{step.day}</span>
                            </div>
                            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{step.type === "email" ? "📧" : "💬"}</span>
                                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                    {step.type}
                                  </span>
                                  {step.subject && (
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">· {step.subject}</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => copyToClipboard(step.subject ? `Subject: ${step.subject}\n\n${step.body}` : step.body)}
                                  className="text-[10px] text-gray-400 hover:text-gray-600 font-medium"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="px-4 py-3">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{step.body}</p>
                                {step.notes && (
                                  <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sales Tip</p>
                                    <p className="text-xs text-gray-500 italic">{step.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
