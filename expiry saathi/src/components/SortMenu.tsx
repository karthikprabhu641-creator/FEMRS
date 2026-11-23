import { defaultMessages as messages } from "../i18n";

export type SortOption = "expiry" | "name" | "quantity" | "added";

export interface SortMenuProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <label className="block">
      <span className="sr-only">{messages.itemList.sortExpiry}</span>
      <select
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
        onChange={(event) => onChange(event.target.value as SortOption)}
        value={value}
      >
        <option value="expiry">{messages.itemList.sortExpiry}</option>
        <option value="name">{messages.itemList.sortName}</option>
        <option value="quantity">{messages.itemList.sortQuantity}</option>
        <option value="added">{messages.itemList.sortAdded}</option>
      </select>
    </label>
  );
}
