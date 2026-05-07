interface Stats {
  total: number;
  newLeads: number;
  contacted: number;
  closed: number;
}

const cards = [
  {
    key: "total" as const,
    label: "Total Leads",
    lightColor: "bg-indigo-50",
    textColor: "text-indigo-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    trend: "All time",
  },
  {
    key: "newLeads" as const,
    label: "New Leads",
    lightColor: "bg-violet-50",
    textColor: "text-violet-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    trend: "Awaiting contact",
  },
  {
    key: "contacted" as const,
    label: "Contacted",
    lightColor: "bg-amber-50",
    textColor: "text-amber-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    trend: "In progress",
  },
  {
    key: "closed" as const,
    label: "Closed Deals",
    lightColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    trend: "Won deals",
  },
];

export default function StatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <div className={`${card.lightColor} p-2.5 rounded-lg`}>
              <span className={card.textColor}>{card.icon}</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{stats[card.key]}</p>
          <p className="text-xs text-gray-400 mt-1.5">{card.trend}</p>
        </div>
      ))}
    </div>
  );
}
