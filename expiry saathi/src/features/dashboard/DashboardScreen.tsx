import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { BatchRow } from "../../components/BatchRow";
import { EmptyState } from "../../components/EmptyState";
import { ListSkeleton } from "../../components/ListSkeleton";
import { SummaryCard } from "../../components/SummaryCard";
import { defaultMessages as messages } from "../../i18n";
import { useCurrentDate } from "../../hooks/useCurrentDate";
import { useDashboard } from "../../hooks/useDashboard";
import type { DashboardBatch } from "../../hooks/useDashboard";

export function DashboardScreen() {
  const today = useCurrentDate();
  const dashboard = useDashboard(today);

  if (!dashboard) return <ListSkeleton />;

  const hasAnyItems = dashboard.allCount > 0;

  if (!hasAnyItems) {
    return (
      <EmptyState
        action={
          <Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" to="/add">
            {messages.dashboard.firstItem}
          </Link>
        }
        description={messages.dashboard.noItemsDescription}
        title={messages.dashboard.noItemsTitle}
      />
    );
  }

  const sellFirst = [
    ...dashboard.expired.items,
    ...dashboard.today.items,
    ...dashboard.next7Days.items,
  ].filter((batch, index, items) => items.findIndex(({ id }) => id === batch.id) === index)
    .sort((first, second) => first.expiryDate.localeCompare(second.expiryDate))
    .slice(0, 10);

  const expiringSoonCount = dashboard.next30Days.count;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{messages.home}</h1>
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard count={dashboard.expired.count} units={sumUnits(dashboard.expired.items)} to="/items?status=expired" title={messages.dashboard.expired} icon={<AlertTriangle size={20} />} tone="rose" />
        <SummaryCard count={dashboard.today.count} units={sumUnits(dashboard.today.items)} to="/items?status=today" title={messages.dashboard.today} icon={<Clock3 size={20} />} tone="orange" />
        <SummaryCard count={dashboard.next7Days.count} units={sumUnits(dashboard.next7Days.items)} to="/items?status=next7" title={messages.dashboard.next7} icon={<AlertTriangle size={20} />} tone="red" />
        <SummaryCard count={dashboard.next30Days.count} units={sumUnits(dashboard.next30Days.items)} to="/items?status=next30" title={messages.dashboard.next30} icon={<ShieldCheck size={20} />} tone="amber" />
      </div>

      {sellFirst.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-bold">{messages.dashboard.sellFirst}</h2>
          <div className="space-y-3">
            {sellFirst.map((batch) => (
              <BatchRow
                batch={batch}
                expiry={{ status: batch.expiryStatus, daysLeft: batch.daysLeft }}
                key={batch.id}
              />
            ))}
          </div>
        </section>
      ) : expiringSoonCount === 0 ? (
        <EmptyState
          title={messages.dashboard.allGoodTitle}
          description={messages.dashboard.allGoodDescription}
        />
      ) : null}
    </div>
  );
}

function sumUnits(items: readonly DashboardBatch[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
