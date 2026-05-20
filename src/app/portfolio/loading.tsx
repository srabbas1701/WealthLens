/**
 * Portfolio Loading Skeleton
 * Shared across all /portfolio/* routes.
 */
export default function PortfolioLoading() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] animate-pulse">
      {/* Header */}
      <div className="h-14 bg-white dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]" />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Page title + summary row */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
          <div className="h-8 w-28 bg-[#E5E7EB] dark:bg-[#334155] rounded-lg" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 space-y-2">
              <div className="h-3 w-20 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
              <div className="h-5 w-28 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
            </div>
          ))}
        </div>

        {/* Holdings table */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] divide-y divide-[#E5E7EB] dark:divide-[#334155]">
          {/* Table header */}
          <div className="flex gap-4 px-5 py-3">
            {[40, 20, 20, 20].map((w, i) => (
              <div key={i} className={`h-3 bg-[#E5E7EB] dark:bg-[#334155] rounded`} style={{ width: `${w}%` }} />
            ))}
          </div>
          {/* Rows */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-7 h-7 rounded-full bg-[#E5E7EB] dark:bg-[#334155] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-36 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
                <div className="h-2 w-20 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
              </div>
              <div className="h-4 w-20 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
              <div className="h-4 w-16 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
