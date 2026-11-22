import { z } from "zod";

const UuidSchema = z.uuid();

export function createId(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("Secure UUID generation is not available in this browser.");
  }

  return UuidSchema.parse(crypto.randomUUID());
}
