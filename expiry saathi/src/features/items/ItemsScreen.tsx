import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { format, parseISO } from "date-fns";
import { FilterChips } from "../../components/FilterChips";
import { SearchInput } from "../../components/SearchInput";
import { SortMenu, type SortOption } from "../../components/SortMenu";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { ListSkeleton } from "../../components/ListSkeleton";
import { defaultMessages as messages } from "../../i18n";
import { getStatus } from "../../domain/expiry";
import type { BatchWithProduct, ExpiryThresholdOverrides } from "../../domain/types";
import { useBatches } from "../../hooks/useBatches";
import { useCategories } from "../../hooks/useCategories";
import { useCurrentDate } from "../../hooks/useCurrentDate";
import { useSettings } from "../../hooks/useSettings";

type StatusFilter = "expired" | "today" | "critical" | "warning" | "soon" | "ok" | "next7" | "next30";

export function ItemsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("expiry");
  const status = isStatusFilter(searchParams.get("status")) ? searchParams.get("status") as StatusFilter : undefined;
  const category = searchParams.get("category") ?? undefined;
  const today = useCurrentDate();
  const batches = useBatches();
  const categories = useCategories();
  const settings = useSettings();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const categoryOptions = useMemo(
    () => (categories ?? []).map((item) => ({ value: item.name, label: item.name })),
    [categories],
  );

  const filtered = useMemo(() => {
    if (!batches) return undefined;
    const thresholdsSetting = settings?.find((setting) => setting.key === "categoryThresholds");
    const thresholdsByCategory = thresholdsSetting?.key === "categoryThresholds"
      ? thresholdsSetting.value
      : {};
    const categoriesByName = new Map((categories ?? []).map((item) => [item.name, item]));
    const normalized = debouncedSearch.trim().toLocaleLowerCase();

    const rows = batches.filter((batch) => {
      const categoryMatches = !category || batch.category === category;
      const searchMatches = !normalized || [batch.name, batch.category, batch.batchNo]
        .some((field) => field?.toLocaleLowerCase().includes(normalized));
      if (!categoryMatches || !searchMatches) return false;

      const categoryRecord = categoriesByName.get(batch.category);
      const thresholds: ExpiryThresholdOverrides = categoryRecord
        ? thresholdsByCategory[categoryRecord.id] ?? {}
        : {};
      const result = getStatus(batch.expiryDate, today, thresholds);
      if (!status) return true;
      if (status === "next7") return result.daysLeft >= 1 && result.daysLeft <= 7;
      if (status === "next30") return result.daysLeft >= 1 && result.daysLeft <= 30;
      return result.status === status;
    });

    return sortRows(rows, sort);
  }, [batches, categories, category, debouncedSearch, settings, sort, status, today]);

  if (!filtered) return <ListSkeleton />;

  const resetFilters = () => setSearchParams({});

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{messages.itemList.title}</h1>
      <SearchInput onChange={setSearch} value={search} />
      <FilterChips
        label={messages.itemList.statusFilter}
        onChange={(value) => updateParam(setSearchParams, "status", value)}
        options={[
          { value: "expired", label: messages.status.expired },
          { value: "today", label: messages.status.today },
          { value: "critical", label: messages.dashboard.criticalFilter },
          { value: "warning", label: messages.dashboard.warningFilter },
          { value: "soon", label: messages.dashboard.soonFilter },
          { value: "ok", label: messages.dashboard.okFilter },
        ]}
        selected={status}
      />
      {categoryOptions.length > 0 ? (
        <FilterChips
          label={messages.itemList.categoryFilter}
          onChange={(value) => updateParam(setSearchParams, "category", value)}
          options={categoryOptions}
          selected={category}
        />
      ) : null}
      <div className="flex items-center gap-3">
        <div className="flex-1"><SortMenu onChange={setSort} value={sort} /></div>
        <button
          className="min-h-12 rounded-xl px-3 text-sm font-bold text-teal-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
          onClick={resetFilters}
          type="button"
        >
          {messages.itemList.filtersReset}
        </button>
      </div>
      <p aria-live="polite" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        {filtered.length} {messages.dashboard.items}
      </p>
      {filtered.length === 0 ? (
        <EmptyState
          action={
            <button className="min-h-12 rounded-xl bg-teal-700 px-5 font-bold text-white" onClick={resetFilters} type="button">
              {messages.itemList.reset}
            </button>
          }
          description={messages.itemList.emptyDescription}
          title={messages.itemList.emptyTitle}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((batch) => {
            const categoryRecord = (categories ?? []).find((item) => item.name === batch.category);
            const thresholdsSetting = settings?.find((setting) => setting.key === "categoryThresholds");
            const thresholdsByCategory = thresholdsSetting?.key === "categoryThresholds"
              ? thresholdsSetting.value
              : {};
            const thresholds: ExpiryThresholdOverrides = categoryRecord
              ? thresholdsByCategory[categoryRecord.id] ?? {}
              : {};
            const result = getStatus(batch.expiryDate, today, thresholds);
            return (
              <Link
                aria-label={`${batch.name}, ${batch.category}, ${batch.quantity} ${batch.unit}`}
                className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-800 dark:bg-slate-900"
                key={batch.id}
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
                <StatusBadge result={result} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isStatusFilter(value: string | null): value is StatusFilter {
  return value !== null &&
    ["expired", "today", "critical", "warning", "soon", "ok", "next7", "next30"].includes(value);
}

function updateParam(
  setSearchParams: (updater: (params: URLSearchParams) => URLSearchParams) => void,
  key: string,
  value: string | undefined,
) {
  setSearchParams((params) => {
    if (value) params.set(key, value);
    else params.delete(key);
    return params;
  });
}

function sortRows(rows: readonly BatchWithProduct[], sort: SortOption): BatchWithProduct[] {
  return rows.slice().sort((first, second) => {
    if (sort === "name") return first.name.localeCompare(second.name);
    if (sort === "quantity") return second.quantity - first.quantity;
    if (sort === "added") return second.createdAt.getTime() - first.createdAt.getTime();
    return first.expiryDate.localeCompare(second.expiryDate);
  });
}
