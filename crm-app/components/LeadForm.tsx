"use client";

import { useState } from "react";

interface LeadFormProps {
  onLeadAdded: () => void;
}

export default function LeadForm({ onLeadAdded }: LeadFormProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ name: "", email: "", phone: "" });
      onLeadAdded();
    } catch {
      setError("Failed to add lead. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-5">Add New Lead</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="John Smith"
              value={form.name}
              onChange={handleChange}
              required
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              required
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={handleChange}
              required
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
          >
            {submitting ? "Saving..." : "Add Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
