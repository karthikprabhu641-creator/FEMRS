import { Minus, Plus } from "lucide-react";
import { Button } from "./Button";
import { defaultMessages as messages } from "../i18n";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  onUnitChange: (unit: string) => void;
  units: readonly string[];
  error?: string;
}

export function QuantityStepper({
  value,
  onChange,
  unit,
  onUnitChange,
  units,
  error,
}: QuantityStepperProps) {
  const inputId = "batch-quantity";

  return (
    <div>
      <label className="block text-sm font-semibold" htmlFor={inputId}>
        {messages.quantity}
      </label>
      <div className="mt-2 flex min-h-16 items-center gap-2">
        <Button
          aria-label={messages.decreaseQuantity}
          className="size-12 shrink-0 p-0"
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          type="button"
          variant="secondary"
        >
          <Minus aria-hidden="true" size={20} />
        </Button>
        <input
          aria-describedby={error ? "quantity-error" : undefined}
          aria-invalid={Boolean(error)}
          className="h-14 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white text-center text-2xl font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
          id={inputId}
          inputMode="decimal"
          min="0"
          onChange={(event) => onChange(event.currentTarget.value === "" ? 0 : Number(event.currentTarget.value))}
          step="any"
          type="number"
          value={Number.isFinite(value) ? value : ""}
        />
        <Button
          aria-label={messages.increaseQuantity}
          className="size-12 shrink-0 p-0"
          onClick={() => onChange(value + 1)}
          type="button"
          variant="secondary"
        >
          <Plus aria-hidden="true" size={20} />
        </Button>
        <label className="sr-only" htmlFor="batch-unit">
          {messages.unit}
        </label>
        <select
          className="min-h-12 max-w-24 rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
          id="batch-unit"
          onChange={(event) => onUnitChange(event.currentTarget.value)}
          value={unit}
        >
          {units.map((unitOption) => (
            <option key={unitOption} value={unitOption}>
              {unitOption}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="mt-1 text-sm font-medium text-rose-700 dark:text-rose-300" id="quantity-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
