import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import type { BatchWithProduct } from "../domain/types";
import type { ExpiryResult } from "../domain/expiry";
import { StatusBadge } from "./StatusBadge";

export interface BatchRowProps {
  batch: BatchWithProduct;
  expiry: ExpiryResult;
}

export function BatchRow({ batch, expiry }: BatchRowProps) {
  return (
    <Link
      aria-label={`${batch.name}, ${batch.category}, ${batch.quantity} ${batch.unit}, ${format(parseISO(batch.expiryDate), "dd MMM yyyy")}`}
      className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-800 dark:bg-slate-900"
      to={`/items/${batch.id}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{batch.name}</span>
        <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
          {batch.category} · {batch.quantity} {batch.unit}
        </span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          {format(parseISO(batch.expiryDate), "dd MMM yyyy")}
        </span>
      </span>
      <StatusBadge result={expiry} />
      <ChevronRight aria-hidden="true" className="shrink-0 text-slate-400" size={20} />
    </Link>
  );
}
