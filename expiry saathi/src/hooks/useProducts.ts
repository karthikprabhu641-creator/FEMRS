import { useLiveQuery } from "dexie-react-hooks";
import { listProducts } from "../db/repos/products";

export function useProducts(search = "") {
  const normalizedSearch = search.trim();
  return useLiveQuery(() => listProducts({ search: normalizedSearch }), [normalizedSearch]);
}
