function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

export function DashboardSkeleton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6" aria-busy="true" aria-label="Memuat dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-52" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <SkeletonBlock className="h-10 w-full sm:w-80" />
          {isAdmin && <SkeletonBlock className="h-10 w-full sm:w-32" />}
        </div>
      </div>

      {isAdmin && (
        <>
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-56 w-full" />
        </>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-28 w-full sm:h-32" />
        ))}
      </div>

      {!isAdmin && (
        <>
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-40 w-full" />
          </div>
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-[28rem] w-full" />
          </div>
        </>
      )}

      {isAdmin && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      )}

      <div className="space-y-3">
        <SkeletonBlock className="h-24 w-full" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>

      <SkeletonBlock className="h-48 w-full" />
    </main>
  );
}
