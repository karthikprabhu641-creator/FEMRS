import type { BatchWithProduct } from "./types";

export interface SortByExpiryOptions {
  includeInactive?: boolean;
}

export function sortByExpiry(
  batches: readonly BatchWithProduct[],
  { includeInactive = false }: SortByExpiryOptions = {},
): BatchWithProduct[] {
  return batches
    .filter((batch) => !batch.deletedAt && (includeInactive || batch.status === "active"))
    .slice()
    .sort((first, second) => {
      const expiryOrder = first.expiryDate.localeCompare(second.expiryDate);
      if (expiryOrder !== 0) {
        return expiryOrder;
      }

      const quantityOrder = first.quantity - second.quantity;
      if (quantityOrder !== 0) {
        return quantityOrder;
      }

      return first.name.localeCompare(second.name);
    });
}
