import Dexie, { type Table } from "dexie";
import type { Batch, Category, Event, Product, ReminderLogEntry, Setting } from "../domain/types";
import { registerMigrations } from "./migrations";

export const DATABASE_NAME = "expiry-saathi";

export class ExpirySaathiDatabase extends Dexie {
  products!: Table<Product, string>;
  batches!: Table<Batch, string>;
  categories!: Table<Category, string>;
  settings!: Table<Setting, string>;
  reminderLog!: Table<ReminderLogEntry, string>;
  events!: Table<Event, string>;

  constructor(name = DATABASE_NAME) {
    super(name);
    registerMigrations(this);
  }
}

export const db = new ExpirySaathiDatabase();
