export function ListSkeleton() {
  return (
    <div aria-label="Loading" role="status" className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" key={item} />
      ))}
    </div>
  );
}
