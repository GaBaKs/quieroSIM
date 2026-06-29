import { Metadata } from 'next';
import Link from 'next/link';
import WholesalePortal from '@/components/wholesale/WholesalePortal';
import { getMyAgency } from '@/server/actions/wholesale';

export const metadata: Metadata = {
  title: 'Portal Mayorista | QuieroSIM',
};

export default async function WholesalePage() {
  const res = await getMyAgency();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Portal Mayorista</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">Para agencias de viaje y revendedores.</p>
        </div>

        {res.ok ? (
          <WholesalePortal agency={res.data} />
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-zinc-300">Iniciá sesión para acceder al portal mayorista.</p>
            <Link href="/login?next=/wholesale" className="inline-block rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold px-5 py-2.5 text-sm transition">Iniciar sesión</Link>
          </div>
        )}
      </div>
    </div>
  );
}
