import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "./Button";
import { defaultMessages as hinglish } from "../i18n";
import { getPresetExpiryDate, type DatePreset } from "../features/add-item/date-presets";
import { StatusBadge } from "./StatusBadge";
import { getStatus } from "../domain/expiry";
import { ExpiryDateSchema } from "../domain/types";

export interface DatePresetsProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: (element: HTMLInputElement | null) => void;
  error?: string;
}

export function DatePresets({ value, onChange, onBlur, inputRef, error }: DatePresetsProps) {
  const today = new Date();
  const validDate = ExpiryDateSchema.safeParse(value);
  const expiryStatus = validDate.success ? getStatus(validDate.data, today) : undefined;

  return (
    <div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{hinglish.expiryDate}</legend>
        <div className="grid grid-cols-3 gap-2">
          {hinglish.datePresets.map(({ key, label }) => (
            <Button
              aria-pressed={value === getPresetExpiryDate(key as DatePreset)}
              className="px-2 text-sm"
              key={key}
              onClick={() => onChange(getPresetExpiryDate(key as DatePreset))}
              type="button"
              variant="secondary"
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-sm font-semibold" htmlFor="expiry-date">
        {hinglish.chooseDate}
      </label>
      <div className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
        <CalendarDays aria-hidden="true" className="shrink-0 text-teal-800 dark:text-teal-300" size={20} />
        <input
          aria-describedby={error ? "expiry-error" : undefined}
          aria-invalid={Boolean(error)}
          className="min-h-12 w-full bg-transparent text-base outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          id="expiry-date"
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
          ref={inputRef}
          type="date"
          value={value}
        />
      </div>
      {error ? (
        <p className="mt-1 text-sm font-medium text-rose-700 dark:text-rose-300" id="expiry-error">
          {error}
        </p>
      ) : null}
      {expiryStatus ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {format(parseISO(value), "dd MMM yyyy")}
          </span>
          <StatusBadge result={expiryStatus} />
          {expiryStatus.daysLeft < 0 ? (
            <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {hinglish.expiredAlreadyWarning}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
