import { useLiveQuery } from "dexie-react-hooks";
import { listEventsForBatch } from "../db/repos/events";

export function useBatchEvents(batchId: string | undefined) {
  return useLiveQuery(
    () => batchId ? listEventsForBatch(batchId) : Promise.resolve([]),
    [batchId],
  );
}
