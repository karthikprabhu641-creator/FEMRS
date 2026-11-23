import { en } from "./en";
import { hinglish } from "./hinglish";

export type Locale = "en" | "hinglish";
export const defaultLocale: Locale = "hinglish";
export const fallbackLocale: Locale = "en";

export function getMessages(locale: Locale = defaultLocale) {
  const selected = locale === "en" ? en : hinglish;
  return {
    ...en,
    ...selected,
    dashboard: { ...en.dashboard, ...selected.dashboard },
    itemList: { ...en.itemList, ...selected.itemList },
    itemDetail: { ...en.itemDetail, ...selected.itemDetail },
    status: { ...en.status, ...selected.status },
    validation: { ...en.validation, ...selected.validation },
  };
}

export const defaultMessages = getMessages();
