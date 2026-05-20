/**
 * Analytics Loading Skeleton
 * Shared across all /analytics/* routes.
 */
export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] animate-pulse">
      {/* Header */}
      <div className="h-14 bg-white dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]" />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Page title */}
        <div className="h-6 w-48 bg-[#E5E7EB] dark:bg-[#334155] rounded" />

        {/* Score / gauge placeholder */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-6 flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#E5E7EB] dark:bg-[#334155] flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-32 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
            <div className="h-3 w-full bg-[#E5E7EB] dark:bg-[#334155] rounded" />
            <div className="h-3 w-4/5 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
          </div>
        </div>

        {/* Breakdown cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-5 space-y-3">
              <div className="h-4 w-32 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
              <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#334155] rounded-full" />
              <div className="h-3 w-3/4 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
            </div>
          ))}
        </div>

        {/* Insight cards */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] px-5 py-4 flex gap-4">
              <div className="w-5 h-5 rounded bg-[#E5E7EB] dark:bg-[#334155] flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
                <div className="h-3 w-full bg-[#E5E7EB] dark:bg-[#334155] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
