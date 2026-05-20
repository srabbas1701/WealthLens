/**
 * Dashboard Loading Skeleton
 * Shown instantly while the dashboard page JS hydrates and data fetches.
 * Mirrors the rough shape of the real dashboard so the transition feels seamless.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] animate-pulse">
      {/* Header skeleton */}
      <div className="h-14 bg-white dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]" />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting + net worth card */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6">
          <div className="h-4 w-40 bg-[#E5E7EB] dark:bg-[#334155] rounded mb-4" />
          <div className="h-9 w-56 bg-[#E5E7EB] dark:bg-[#334155] rounded mb-2" />
          <div className="h-3 w-32 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
        </div>

        {/* Allocation bar */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-5">
          <div className="h-4 w-32 bg-[#E5E7EB] dark:bg-[#334155] rounded mb-4" />
          <div className="flex gap-1 h-4 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
            ))}
          </div>
        </div>

        {/* AI summary card */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-5 space-y-3">
          <div className="h-4 w-48 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
          <div className="h-3 w-full bg-[#E5E7EB] dark:bg-[#334155] rounded" />
          <div className="h-3 w-5/6 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
          <div className="h-3 w-4/6 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
        </div>

        {/* Holdings rows */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] divide-y divide-[#E5E7EB] dark:divide-[#334155]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E5E7EB] dark:bg-[#334155]" />
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
                  <div className="h-2 w-20 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
