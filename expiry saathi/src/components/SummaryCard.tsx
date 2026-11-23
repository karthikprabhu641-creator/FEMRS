import type { ReactNode } from "react";
import { Link } from "react-router";
import { defaultMessages as messages } from "../i18n";

export interface SummaryCardProps {
  title: string;
  count: number;
  units: number;
  to: string;
  icon: ReactNode;
  tone: "rose" | "orange" | "red" | "amber";
}

const toneClassNames = {
  rose: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100",
  orange: "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100",
  red: "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
  amber: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
} as const;

export function SummaryCard({ title, count, units, to, icon, tone }: SummaryCardProps) {
  return (
    <Link
      aria-label={`${title}: ${count} ${messages.dashboard.items}, ${units} ${messages.dashboard.units}`}
      className={`flex min-h-28 flex-col justify-between rounded-2xl border p-4 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${toneClassNames[tone]}`}
      to={to}
    >
      <span aria-hidden="true" className="flex size-8 items-center justify-center">{icon}</span>
      <span>
        <span className="block text-2xl font-bold">{count}</span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs opacity-75">{units} {messages.dashboard.units}</span>
      </span>
    </Link>
  );
}
