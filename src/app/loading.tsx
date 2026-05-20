/**
 * Root Loading Skeleton
 * Shown during the very first app load / any top-level navigation.
 */
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A] animate-pulse">
      <div className="h-14 bg-white dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]" />
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        <div className="h-6 w-48 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
        <div className="h-4 w-full bg-[#E5E7EB] dark:bg-[#334155] rounded" />
        <div className="h-4 w-5/6 bg-[#E5E7EB] dark:bg-[#334155] rounded" />
      </div>
    </div>
  );
}
