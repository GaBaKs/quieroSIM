import { notFound } from 'next/navigation';
import { getBatchInvoice } from '@/server/actions/wholesale';
import PrintButton from '@/components/wholesale/PrintButton';

// Emisor (QUIERO LLC). Ajustar con los datos fiscales reales.
const ISSUER = {
  name: 'QUIERO LLC',
  detail: 'Wyoming, USA · QuieroSIM',
};

const usd = (n: number) => `$${n.toFixed(2)}`;

export default async function InvoicePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const res = await getBatchInvoice({ batchId });
  if (!res.ok) notFound();
  const { batch, agency, items } = res.data;

  return (
    <div className="min-h-screen bg-white text-slate-900 px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black">{ISSUER.name}</h1>
            <p className="text-sm text-slate-500">{ISSUER.detail}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Factura / Recibo</p>
            <p className="text-lg font-black">{batch.invoice_number ?? '—'}</p>
            <p className="text-xs text-slate-500">{batch.paid_at ? new Date(batch.paid_at).toLocaleDateString() : ''}</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Facturar a</p>
          <p className="font-bold">{agency.company_name}</p>
          {agency.tax_id && <p className="text-sm text-slate-600">CUIT / Tax ID: {agency.tax_id}</p>}
          {agency.billing_address && <p className="text-sm text-slate-600">{agency.billing_address}</p>}
        </div>

        <table className="w-full text-left mb-6">
          <thead>
            <tr className="border-b-2 border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2">Detalle</th>
              <th className="py-2 text-center">Cant.</th>
              <th className="py-2 text-right">Unitario</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{it.plan}</td>
                <td className="py-2 text-center">{it.qty}</td>
                <td className="py-2 text-right">{usd(Number(it.unit))}</td>
                <td className="py-2 text-right font-medium">{usd(Number(it.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-10">
          <div className="w-56">
            <div className="flex justify-between border-t-2 border-slate-300 pt-2">
              <span className="font-black">Total ({batch.currency})</span>
              <span className="font-black text-lg">{usd(Number(batch.total_wholesale_usd))}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{batch.item_count} eSIM{batch.item_count === 1 ? '' : 's'} · precio mayorista</p>
          </div>
        </div>

        <PrintButton />
        <p className="text-[11px] text-slate-400 mt-6 print:mt-2">Documento generado por QuieroSIM. Para uso comercial entre QUIERO LLC y la agencia.</p>
      </div>
    </div>
  );
}
