import { useLiveQuery } from "dexie-react-hooks";
import { sortByExpiry } from "../domain/fifo";
import type { BatchStatus, BatchWithProduct } from "../domain/types";
import { listBatchesWithProduct } from "../db/repos/batches";

export interface BatchFilters {
  status?: BatchStatus;
  category?: string;
  search?: string;
}

export function useBatches(filters: BatchFilters = {}): BatchWithProduct[] | undefined {
  const { status, category, search } = filters;

  return useLiveQuery(
    async () =>
      sortByExpiry(await listBatchesWithProduct({ status, category, search }), {
        includeInactive: true,
      }),
    [status, category, search],
  );
}
