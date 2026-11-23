import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { defaultMessages as messages } from "../../i18n";
import { useBatches } from "../../hooks/useBatches";
import { ListSkeleton } from "../../components/ListSkeleton";

export function ItemDetailScreen() {
  const { id } = useParams();
  const batches = useBatches();
  const batch = batches?.find((item) => item.id === id);

  if (!batches) return <ListSkeleton />;
  if (!batch) return <h1>{messages.itemDetail.notFound}</h1>;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-bold">{batch.name}</h1>
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
    </section>
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
