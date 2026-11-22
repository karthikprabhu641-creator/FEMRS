import { useLiveQuery } from "dexie-react-hooks";
import { listSettings } from "../db/repos/settings";

export function useSettings() {
  return useLiveQuery(listSettings, []);
}
