'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Download, Loader2, Package } from 'lucide-react';
import { getMyBatches, getBatchQrs, type WholesaleBatchRow } from '@/server/actions/wholesale';

const usd = (n: number) => `$${n.toFixed(2)}`;

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pago pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  paid: { label: 'Pagado', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  cancelled: { label: 'Cancelado', cls: 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
};

export default function WholesaleBatches() {
  const [batches, setBatches] = useState<WholesaleBatchRow[] | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => { getMyBatches().then((r) => setBatches(r.ok ? r.data : [])); }, []);

  const downloadCsv = async (batchId: string, invoice: string | null) => {
    setDownloading(batchId);
    const res = await getBatchQrs({ batchId });
    setDownloading(null);
    if (!res.ok) { alert(res.error.message); return; }
    const header = 'plan,iccid,codigo_activacion_lpa,ios_tap_link,cliente_email,estado\n';
    const esc = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const body = res.data.map((e) => [e.planName, e.iccid, e.qrLpa, e.iosTapLink, e.assignedClientEmail, e.statusQr].map(esc).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `esims-${invoice ?? batchId.slice(0, 8)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (batches === null) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-300" /></div>;
  if (batches.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-10 text-center">
        <Package className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Todavía no compraste ningún lote.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/5">
      {batches.map((b) => {
        const st = STATUS[b.status] ?? STATUS.pending;
        return (
          <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#9933c1] dark:text-[#b3ff6b]">{b.invoiceNumber ?? 'sin factura'}</span>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${st.cls}`}>{st.label}</span>
              </div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">{b.itemCount} eSIM{b.itemCount === 1 ? '' : 's'} · {usd(b.total)}</p>
              <p className="text-[11px] text-zinc-400">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''} · {b.delivered}/{b.itemCount} emitidas</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {b.status === 'paid' && (
                <>
                  <Link href={`/wholesale/invoice/${b.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer">
                    <FileText className="h-3.5 w-3.5" /> Factura
                  </Link>
                  <button onClick={() => downloadCsv(b.id, b.invoiceNumber)} disabled={downloading === b.id} className="inline-flex items-center gap-1 rounded-lg bg-[#9933c1] hover:bg-[#7100a5] text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50">
                    {downloading === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} QRs (CSV)
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
