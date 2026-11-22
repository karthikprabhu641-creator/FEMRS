import { z } from "zod";
import { EventSchema, type Event } from "../../domain/types";
import { createId } from "../../lib/id";
import { requestPersistentStorageAfterFirstSave } from "../../lib/persist";
import { db, type ExpirySaathiDatabase } from "../schema";

const EventInputSchema = EventSchema.omit({ id: true, at: true })
  .extend({ at: z.date().optional() })
  .strict();

export function createEventsRepository(database: ExpirySaathiDatabase = db) {
  return {
    async add(input: unknown): Promise<Event> {
      const values = EventInputSchema.parse(input);
      const event = EventSchema.parse({
        ...values,
        id: createId(),
        at: values.at ?? new Date(),
      });
      await database.events.add(event);
      await requestPersistentStorageAfterFirstSave();
      return event;
    },

    async getById(id: string): Promise<Event | undefined> {
      return database.events.get(z.uuid().parse(id));
    },

    async listForBatch(batchId: string): Promise<Event[]> {
      return database.events.where("batchId").equals(z.uuid().parse(batchId)).sortBy("at");
    },

    async list(): Promise<Event[]> {
      return database.events.orderBy("at").toArray();
    },
  };
}

const eventsRepository = createEventsRepository();

export const addEvent = eventsRepository.add;
export const getEventById = eventsRepository.getById;
export const listEventsForBatch = eventsRepository.listForBatch;
export const listEvents = eventsRepository.list;
