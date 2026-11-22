import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { ExpiryResult, ExpiryStatus } from "../domain/expiry";
import { defaultMessages as hinglish } from "../i18n";

const statusClassNames: Record<ExpiryStatus, string> = {
  expired: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  today: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  critical: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  warning: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  soon: "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100",
  ok: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
};

const statusIcons = {
  expired: XCircle,
  today: Clock3,
  critical: AlertTriangle,
  warning: AlertTriangle,
  soon: Clock3,
  ok: CheckCircle2,
} as const;

export interface StatusBadgeProps {
  result: ExpiryResult;
}

export function StatusBadge({ result }: StatusBadgeProps) {
  const Icon = statusIcons[result.status];
  const label = getStatusLabel(result.status, result.daysLeft);

  return (
    <span
      aria-label={label}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${statusClassNames[result.status]}`}
    >
      <Icon aria-hidden="true" size={16} />
      <span>{label}</span>
    </span>
  );
}

function getStatusLabel(status: ExpiryStatus, daysLeft: number): string {
  if (daysLeft < 0) {
    return hinglish.status.expired;
  }
  if (daysLeft === 0) {
    return hinglish.status.today;
  }
  if (status === "critical") {
    return hinglish.status.critical(daysLeft);
  }
  if (status === "warning") {
    return hinglish.status.warning(daysLeft);
  }
  if (status === "soon") {
    return hinglish.status.soon(daysLeft);
  }
  return hinglish.status.ok;
}
