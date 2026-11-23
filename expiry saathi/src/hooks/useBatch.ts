import { useLiveQuery } from "dexie-react-hooks";
import { listBatchesWithProduct } from "../db/repos/batches";

export function useBatch(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const batches = await listBatchesWithProduct({ includeDeleted: true });
    return batches.find((batch) => batch.id === id);
  }, [id]);
}
