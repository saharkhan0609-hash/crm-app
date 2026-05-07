"use client";

import Sidebar from "./Sidebar";
import AIAssistant from "./AIAssistant";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
      <AIAssistant />
    </div>
  );
}
