import type { ReactNode } from "react";
import { CheckCircle2, Undo2, X } from "lucide-react";
import { Button } from "./Button";
import { defaultMessages as hinglish } from "../i18n";

export interface ToastProps {
  children: ReactNode;
  onUndo: () => void;
  onDismiss: () => void;
  actions?: ReactNode;
}

export function Toast({ children, onUndo, onDismiss, actions }: ToastProps) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="fixed inset-x-3 bottom-24 z-30 mx-auto max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-4 text-white shadow-xl"
      role="status"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={20} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{children}</p>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
          <Button
            className="mt-3 min-h-10 px-2 text-sm text-teal-200 hover:bg-slate-800"
            onClick={onUndo}
            type="button"
            variant="quiet"
          >
            <Undo2 aria-hidden="true" size={16} />
            {hinglish.undo}
          </Button>
        </div>
        <button
          aria-label={hinglish.dismiss}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );
}
