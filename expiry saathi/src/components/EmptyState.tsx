import { PackageOpen } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <PackageOpen aria-hidden="true" className="mx-auto text-teal-700 dark:text-teal-300" size={32} />
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-slate-600 dark:text-slate-300">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
