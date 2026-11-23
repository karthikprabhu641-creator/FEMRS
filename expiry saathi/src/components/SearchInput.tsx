import { Search } from "lucide-react";
import { defaultMessages as messages } from "../i18n";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{messages.searchProducts}</span>
      <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
      <input
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
        onChange={(event) => onChange(event.target.value)}
        placeholder={messages.searchProducts}
        type="search"
        value={value}
      />
    </label>
  );
}
