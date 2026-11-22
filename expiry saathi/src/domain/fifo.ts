import type { Batch } from "./types";

export function sortByExpiry(batches: readonly Batch[]): Batch[] {
  return batches
    .filter((batch) => batch.status === "active" && !batch.deletedAt)
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
