export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterChipsProps {
  label: string;
  options: FilterOption[];
  selected: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function FilterChips({ label, options, selected, onChange }: FilterChipsProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            aria-pressed={selected === option.value}
            className={`min-h-12 shrink-0 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
              selected === option.value
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
            key={option.value}
            onClick={() => onChange(selected === option.value ? undefined : option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
