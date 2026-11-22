import type { Dexie } from "dexie";

export const DATABASE_VERSION = 1;

export const DATABASE_STORES = {
  products: "&id,name,barcode,category",
  batches: "&id,expiryDate,[status+expiryDate],productId,status",
  categories: "&id,name",
  settings: "&key",
  reminderLog: "&id,batchId,kind,firedAt",
  events: "&id,batchId,type,at",
} as const;

export function registerMigrations(database: Dexie): void {
  database.version(DATABASE_VERSION).stores(DATABASE_STORES);
}
