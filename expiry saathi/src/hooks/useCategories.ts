import { useLiveQuery } from "dexie-react-hooks";
import { listCategories } from "../db/repos/categories";

export function useCategories() {
  return useLiveQuery(() => listCategories());
}
