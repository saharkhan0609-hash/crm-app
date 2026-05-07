"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/ai";

interface Lead {
  _id: string;
  name: string;
  pipelineStatus: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm your AI sales assistant powered by Claude. Select a lead for context, then ask me to draft emails, score leads, plan next steps, or anything else CRM-related.",
};

export default function AIAssistant() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<ChatMessage[]>([GREETING]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && leads.length === 0) {
      fetch("/api/leads").then(r => r.json()).then(setLeads).catch(() => {});
    }
  }, [open, leads.length]);

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || streaming) return;
    setInput("");

    const history: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(history);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);

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
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: full };
          return next;
        });
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "⚠️ Error reaching AI. Check that `ANTHROPIC_API_KEY` is set in `.env.local`.",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  const QUICK = selectedLead
    ? [
        { emoji: "📧", label: "Draft Email",  prompt: `Draft a follow-up email for ${selectedLead.name}` },
        { emoji: "💬", label: "Draft SMS",    prompt: `Write a follow-up SMS (under 160 chars) for ${selectedLead.name}` },
        { emoji: "🎯", label: "Score Lead",   prompt: `Score ${selectedLead.name}'s conversion likelihood and give me the top next action` },
        { emoji: "📋", label: "Next Steps",   prompt: `What are the 3 best next actions for ${selectedLead.name} in the "${selectedLead.pipelineStatus}" stage?` },
      ]
    : [
        { emoji: "💡", label: "Tips",      prompt: "Give me 5 quick tips to convert more leads in a B2B SaaS CRM" },
        { emoji: "📈", label: "Pipeline",  prompt: "How do I move leads faster through each pipeline stage?" },
        { emoji: "✉️", label: "Templates", prompt: "Give me 3 high-converting follow-up email templates" },
        { emoji: "🤝", label: "Closing",   prompt: "What are the best techniques to close deals on the first or second call?" },
      ];

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-2xl hover:shadow-violet-500/30 hover:scale-105 transition-all duration-200"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        AI Assistant
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[390px] z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">AI Assistant</p>
                <p className="text-violet-200 text-[10px] mt-0.5">Powered by Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([GREETING])}
                title="Clear chat"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Lead selector */}
          <div className="relative">
            <button
              onClick={() => setShowPicker(p => !p)}
              className="w-full flex items-center justify-between bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-white/10"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${selectedLead ? "bg-green-400" : "bg-white/40"}`} />
                <span>{selectedLead ? `Context: ${selectedLead.name} · ${selectedLead.pipelineStatus}` : "No lead selected"}</span>
              </div>
              <svg className="w-3 h-3 opacity-60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPicker && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20 max-h-52 overflow-y-auto">
                <button
                  onClick={() => { setSelectedLead(null); setShowPicker(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100 font-medium"
                >
                  General chat (no lead context)
                </button>
                {leads.map(l => (
                  <button
                    key={l._id}
                    onClick={() => { setSelectedLead(l); setShowPicker(false); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors ${selectedLead?._id === l._id ? "bg-indigo-50" : ""}`}
                  >
                    <p className="text-xs font-semibold text-gray-900">{l.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{l.pipelineStatus}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
          {QUICK.map(a => (
            <button
              key={a.label}
              onClick={() => sendMessage(a.prompt)}
              disabled={streaming}
              title={a.label}
              className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg hover:bg-white border border-transparent hover:border-indigo-100 hover:shadow-sm transition-all disabled:opacity-40 group"
            >
              <span className="text-lg">{a.emoji}</span>
              <span className="text-[9px] font-semibold text-gray-500 group-hover:text-indigo-600 text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-black shrink-0 mt-0.5 shadow-sm">
                  AI
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm shadow-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
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
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything… (Enter to send)"
              rows={1}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent overflow-hidden"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors shrink-0 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">Claude · Shift+Enter for newline</p>
        </div>
      </div>
    </>
  );
}
