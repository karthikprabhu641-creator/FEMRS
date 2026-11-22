import { useLiveQuery } from "dexie-react-hooks";
import { getStatus, type ExpiryStatus } from "../domain/expiry";
import { sortByExpiry } from "../domain/fifo";
import type { BatchWithProduct, ExpiryThresholdOverrides } from "../domain/types";
import { listBatchesWithProduct } from "../db/repos/batches";
import { listCategories } from "../db/repos/categories";
import { getSetting } from "../db/repos/settings";

export interface DashboardBatch extends BatchWithProduct {
  daysLeft: number;
  expiryStatus: ExpiryStatus;
}

export interface DashboardBucket {
  count: number;
  items: DashboardBatch[];
}

export interface DashboardData {
  expired: DashboardBucket;
  today: DashboardBucket;
  next7Days: DashboardBucket;
  next30Days: DashboardBucket;
}

const makeBucket = (items: DashboardBatch[]): DashboardBucket => ({
  count: items.length,
  items,
});

export function useDashboard(): DashboardData | undefined {
  return useLiveQuery(async () => {
    const [batchRows, categories, thresholdsSetting] = await Promise.all([
      listBatchesWithProduct({ status: "active" }),
      listCategories(),
      getSetting("categoryThresholds"),
    ]);
    const batches = sortByExpiry(batchRows);
    const categoriesByName = new Map(categories.map((category) => [category.name, category]));
    const thresholdsByCategory =
      thresholdsSetting?.key === "categoryThresholds" ? thresholdsSetting.value : {};
    const today = new Date();
    const expired: DashboardBatch[] = [];
    const todayItems: DashboardBatch[] = [];
    const next7Days: DashboardBatch[] = [];
    const next30Days: DashboardBatch[] = [];

    for (const batch of batches) {
      const category = categoriesByName.get(batch.category);
      if (!category) {
        throw new Error(`Missing category "${batch.category}" for batch "${batch.id}".`);
      }

      const thresholds: ExpiryThresholdOverrides = thresholdsByCategory[category.id] ?? {};
      const { status, daysLeft } = getStatus(batch.expiryDate, today, thresholds);
      const dashboardBatch: DashboardBatch = {
        ...batch,
        daysLeft,
        expiryStatus: status,
      };

      if (daysLeft < 0) {
        expired.push(dashboardBatch);
      } else if (daysLeft === 0) {
        todayItems.push(dashboardBatch);
      } else if (daysLeft <= 7) {
        next7Days.push(dashboardBatch);
        next30Days.push(dashboardBatch);
      } else if (daysLeft <= 30) {
        next30Days.push(dashboardBatch);
      }
    }

    return {
      expired: makeBucket(expired),
      today: makeBucket(todayItems),
      next7Days: makeBucket(next7Days),
      next30Days: makeBucket(next30Days),
    };
  }, []);
}
