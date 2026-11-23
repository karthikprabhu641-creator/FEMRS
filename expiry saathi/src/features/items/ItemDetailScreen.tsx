import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { defaultMessages as messages } from "../../i18n";
import { useBatch } from "../../hooks/useBatch";
import { useBatchEvents } from "../../hooks/useBatchEvents";
import { ListSkeleton } from "../../components/ListSkeleton";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";
import {
  markDiscarded,
  markReturned,
  markSold,
  restoreBatch,
  softDeleteBatch,
  updateBatch,
} from "../../db/repos/batches";

export function ItemDetailScreen() {
  const { id } = useParams();
  const batch = useBatch(id);
  const events = useBatchEvents(id);
  const [editing, setEditing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"sold" | "discarded" | "returned" | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [mrp, setMrp] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  function startEditing(): void {
    if (!batch) return;
    setQuantity(String(batch.quantity));
    setExpiryDate(batch.expiryDate);
    setBatchNo(batch.batchNo ?? "");
    setMrp(batch.mrp === undefined ? "" : String(batch.mrp));
    setCostPrice(batch.costPrice === undefined ? "" : String(batch.costPrice));
    setSupplier(batch.supplier ?? "");
    setLocation(batch.location ?? "");
    setNotes(batch.notes ?? "");
    setEditing(true);
  }

  useEffect(() => {
    if (!deleted || !id) return;
    const timeoutId = window.setTimeout(() => setDeleted(false), 8_000);
    return () => window.clearTimeout(timeoutId);
  }, [deleted, id]);

  if (batch === undefined) return <ListSkeleton />;
  if (!batch) return <h1>{messages.itemDetail.notFound}</h1>;

  async function saveEdit(): Promise<void> {
    if (!batch) return;
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError(messages.validation.quantityPositive);
      return;
    }
    if (!expiryDate) {
      setError(messages.validation.expiryRequired);
      return;
    }
    try {
      await updateBatch(batch.id, {
        quantity: parsedQuantity,
        expiryDate,
        batchNo: batchNo.trim() || undefined,
        mrp: mrp.trim() ? Number(mrp) : undefined,
        costPrice: costPrice.trim() ? Number(costPrice) : undefined,
        supplier: supplier.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setEditing(false);
      setError("");
    } catch (updateError: unknown) {
      console.error("Could not update batch.", updateError);
      setError(messages.itemDetail.updateFailed);
    }
  }

  async function confirmStatus(): Promise<void> {
    if (!batch || !confirmAction) return;
    try {
      if (confirmAction === "sold") await markSold(batch.id);
      if (confirmAction === "discarded") await markDiscarded(batch.id);
      if (confirmAction === "returned") await markReturned(batch.id);
      setConfirmAction(null);
      setError("");
    } catch (actionError: unknown) {
      console.error("Could not update batch status.", actionError);
      setError(messages.itemDetail.updateFailed);
    }
  }

  async function deleteBatch(): Promise<void> {
    if (!batch) return;
    try {
      await softDeleteBatch(batch.id);
      setDeleted(true);
      setError("");
    } catch (deleteError: unknown) {
      console.error("Could not delete batch.", deleteError);
      setError(messages.itemDetail.updateFailed);
    }
  }

  async function undoDelete(): Promise<void> {
    if (!batch) return;
    try {
      await restoreBatch(batch.id);
      setDeleted(false);
    } catch (restoreError: unknown) {
      console.error("Could not restore batch.", restoreError);
      setError(messages.itemDetail.updateFailed);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{batch.name}</h1>
          {batch.status === "active" ? (
            <Button onClick={editing ? () => setEditing(false) : startEditing} variant="secondary">
              {editing ? messages.itemDetail.cancel : messages.itemDetail.edit}
            </Button>
          ) : null}
        </div>

        {editing ? (
          <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void saveEdit(); }}>
            <FormField label={messages.itemDetail.quantity} value={quantity} onChange={setQuantity} type="number" />
            <FormField label={messages.itemDetail.expiryDate} value={expiryDate} onChange={setExpiryDate} type="date" />
            <FormField label={messages.itemDetail.batchNumber} value={batchNo} onChange={setBatchNo} />
            <FormField label={messages.itemDetail.mrp} value={mrp} onChange={setMrp} type="number" />
            <FormField label={messages.itemDetail.costPrice} value={costPrice} onChange={setCostPrice} type="number" />
            <FormField label={messages.itemDetail.supplier} value={supplier} onChange={setSupplier} />
            <FormField label={messages.itemDetail.location} value={location} onChange={setLocation} />
            <label className="block text-sm font-semibold">
              {messages.itemDetail.notes}
              <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => setNotes(event.target.value)} value={notes} />
            </label>
            {error ? <p className="text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
            <Button type="submit">{messages.itemDetail.save}</Button>
          </form>
        ) : (
          <dl className="mt-5 space-y-3">
            <Detail label={messages.itemDetail.category} value={batch.category} />
            <Detail label={messages.itemDetail.quantity} value={`${batch.quantity} ${batch.unit}`} />
            <Detail label={messages.itemDetail.expiryDate} value={format(parseISO(batch.expiryDate), "dd MMM yyyy")} />
            {batch.batchNo ? <Detail label={messages.itemDetail.batchNumber} value={batch.batchNo} /> : null}
            {batch.mrp !== undefined ? <Detail label={messages.itemDetail.mrp} value={String(batch.mrp)} /> : null}
            {batch.costPrice !== undefined ? <Detail label={messages.itemDetail.costPrice} value={String(batch.costPrice)} /> : null}
            {batch.supplier ? <Detail label={messages.itemDetail.supplier} value={batch.supplier} /> : null}
            {batch.location ? <Detail label={messages.itemDetail.location} value={batch.location} /> : null}
            {batch.notes ? <Detail label={messages.itemDetail.notes} value={batch.notes} /> : null}
          </dl>
        )}

        {batch.status === "active" && !editing ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Button onClick={() => setConfirmAction("sold")}>{messages.itemDetail.sold}</Button>
            <Button onClick={() => setConfirmAction("discarded")} variant="secondary">{messages.itemDetail.discarded}</Button>
            <Button onClick={() => setConfirmAction("returned")} variant="secondary">{messages.itemDetail.returned}</Button>
            <Button className="sm:col-span-3" onClick={() => void deleteBatch()} variant="danger">{messages.itemDetail.delete}</Button>
          </div>
        ) : null}
        {error ? <p className="mt-4 text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">{messages.itemDetail.history}</h2>
        {events && events.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {[...events].reverse().map((event) => (
              <li className="border-b border-slate-100 pb-3 text-sm dark:border-slate-800" key={event.id}>
                <span className="font-semibold">{eventLabel(event.type)}</span>
                <span className="ml-2 text-slate-600 dark:text-slate-300">{format(event.at, "dd MMM yyyy, HH:mm")} · {event.qty}</span>
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{messages.itemDetail.noHistory}</p>}
      </section>

      {confirmAction ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center">
          <div aria-modal="true" role="dialog" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold">{messages.itemDetail.actionConfirm}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {confirmAction === "sold" ? messages.itemDetail.soldConfirm :
                confirmAction === "discarded" ? messages.itemDetail.discardedConfirm :
                  messages.itemDetail.returnedConfirm}
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => void confirmStatus()}>{messages.itemDetail.actionConfirm}</Button>
              <Button onClick={() => setConfirmAction(null)} variant="secondary">{messages.itemDetail.cancel}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleted ? (
        <Toast onDismiss={() => setDeleted(false)} onUndo={() => void undoDelete()}>
          {messages.itemDetail.deleted}
        </Toast>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
      <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-950"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function eventLabel(type: "created" | "edited" | "sold" | "discarded" | "returned"): string {
  if (type === "created") return messages.itemDetail.eventCreated;
  if (type === "edited") return messages.itemDetail.eventEdited;
  if (type === "sold") return messages.itemDetail.eventSold;
  if (type === "discarded") return messages.itemDetail.eventDiscarded;
  return messages.itemDetail.eventReturned;
}
