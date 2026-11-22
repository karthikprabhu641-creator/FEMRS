import { SettingInputSchema, SettingSchema, type Setting } from "../../domain/types";
import { requestPersistentStorageAfterFirstSave } from "../../lib/persist";
import { db, type ExpirySaathiDatabase } from "../schema";

export function createSettingsRepository(database: ExpirySaathiDatabase = db) {
  return {
    async set(input: unknown): Promise<Setting> {
      const values = SettingInputSchema.parse(input);
      const setting = SettingSchema.parse({ ...values, updatedAt: new Date() });
      await database.settings.put(setting);
      await requestPersistentStorageAfterFirstSave();
      return setting;
    },

    async get(key: Setting["key"]): Promise<Setting | undefined> {
      return database.settings.get(key);
    },

    async list(): Promise<Setting[]> {
      return database.settings.toArray();
    },
  };
}

const settingsRepository = createSettingsRepository();

export const setSetting = settingsRepository.set;
export const getSetting = settingsRepository.get;
export const listSettings = settingsRepository.list;
