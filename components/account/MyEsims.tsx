'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar, Check, Copy, Loader2, Mail, QrCode, Signal, Smartphone, X, AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMyEsims, resendQrEmail, type MyEsim } from '@/server/actions/esims';

const LOCALES: Record<string, string> = { ES: 'es-AR', EN: 'en-US', PT: 'pt-BR' };

const STATUS_STYLES: Record<string, string> = {
  generated: 'bg-slate-100 text-slate-600',
  installed: 'bg-blue-50 text-blue-700',
  active: 'bg-[#b3ff6b]/30 text-green-900',
  expired: 'bg-red-50 text-red-600',
};

export default function MyEsims({ initialEsims, userId }: { initialEsims: MyEsim[]; userId: string }) {
  const { t, lang } = useLanguage();
  const [esims, setEsims] = useState<MyEsim[]>(initialEsims);
  const [qrOpen, setQrOpen] = useState<MyEsim | null>(null);
  const [copied, setCopied] = useState(false);
  const [resendState, setResendState] = useState<Record<string, 'sending' | 'sent' | string>>({});

  // Realtime: cualquier cambio en MIS eSIMs (estado/consumo) refresca la lista.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel('my-esims')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'esim', filter: `user_id=eq.${userId}` },
        async () => {
          const result = await getMyEsims();
          if (result.ok) setEsims(result.data);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(LOCALES[lang] ?? 'es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const statusLabel = (status: string) => t(`account.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);

  const handleResend = async (esimId: string) => {
    setResendState((s) => ({ ...s, [esimId]: 'sending' }));
    const result = await resendQrEmail({ esimId });
    setResendState((s) => ({ ...s, [esimId]: result.ok ? 'sent' : result.error.message }));
  };

  const copyLpa = async (lpa: string) => {
    try {
      await navigator.clipboard.writeText(lpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard no disponible: el usuario puede seleccionar el texto
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-black text-slate-900 tracking-tight">{t('account.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('account.subtitle')}</p>
      </div>

      {/* Aviso Importante de activación */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-blue-600" />
        <p>{lang === 'EN' ? 'IMPORTANT: Days start counting automatically upon arrival at the destination.' : lang === 'PT' ? 'IMPORTANTE: Os dias começam a contar automaticamente ao chegar no destino.' : 'IMPORTANTE: Los días comienzan a contar automáticamente al llegar a destino.'}</p>
      </div>

      {esims.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
          <Smartphone className="mx-auto h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t('account.empty')}</p>
          <Link
            href="/#destinations"
            className="inline-block rounded-full bg-[var(--color-lime)] px-5 py-2.5 text-sm font-black text-slate-900 hover:bg-[var(--color-lime-vivid,#a4f55a)] transition"
          >
            {t('account.emptyCta')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {esims.map((esim) => {
            // YeSim solo reporta data_package_mb/data_used_mb tras la activación;
            // hasta entonces usamos el tamaño nominal del plan (dataAmount en GB)
            // como denominador para mostrar igual el consumo (0 / X MB).
            const packageMb =
              esim.dataPackageMb ??
              (esim.dataAmount && !Number.isNaN(Number(esim.dataAmount))
                ? Math.round(Number(esim.dataAmount) * 1024)
                : null);
            const usedMb = esim.dataUsedMb ?? 0;
            const usagePct = packageMb ? Math.min(100, Math.round((usedMb / packageMb) * 100)) : null;
            const resend = resendState[esim.id];

            return (
              <div key={esim.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-sans font-bold text-slate-900 text-sm">{esim.planName}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t('account.order')} #{esim.orderShortId} · {fmtDate(esim.purchasedAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[esim.status] ?? STATUS_STYLES.generated}`}>
                    {statusLabel(esim.status)}
                  </span>
                </div>

                {/* Consumo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-bold uppercase tracking-wide text-slate-400">
                      <Signal className="h-3 w-3" /> {t('account.usage')}
                    </span>
                    {packageMb ? (
                      <span>
                        {Math.round(usedMb)} / {Math.round(packageMb)} MB
                      </span>
                    ) : (
                      <span>{t('account.noUsage')}</span>
                    )}
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-violet)] transition-all duration-700"
                      style={{ width: `${usagePct ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Fechas */}
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {t('account.activated')}: <strong className="text-slate-700">{fmtDate(esim.planActivatedAt)}</strong>
                  </span>
                  <span>
                    {t('account.expires')}: <strong className="text-slate-700">{fmtDate(esim.planExpiredAt)}</strong>
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {esim.qrLpa && (
                    <button
                      onClick={() => setQrOpen(esim)}
                      className="flex items-center gap-1.5 rounded-full bg-[var(--color-violet)] px-4 py-2 text-xs font-bold text-white hover:bg-[#7100a5] transition cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" /> {t('account.viewQr')}
                    </button>
                  )}
                  <button
                    onClick={() => handleResend(esim.id)}
                    disabled={resend === 'sending' || resend === 'sent'}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:border-[var(--color-violet)] hover:text-[var(--color-violet)] transition disabled:opacity-60 cursor-pointer"
                  >
                    {resend === 'sending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    {resend === 'sent' ? t('account.resendOk') : t('account.resendEmail')}
                  </button>
                </div>
                {resend && resend !== 'sending' && resend !== 'sent' && (
                  <p className="text-[11px] text-red-500">{resend}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal QR */}
      <AnimatePresence>
        {qrOpen && qrOpen.qrLpa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setQrOpen(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setQrOpen(null)}
                className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label={t('account.close')}
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="font-sans font-bold text-slate-900 text-sm pt-2">{qrOpen.planName}</h3>
              <div className="inline-block rounded-xl border border-slate-150 bg-white p-3 shadow-inner">
                <QRCodeSVG value={qrOpen.qrLpa} size={200} className="mx-auto" />
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('checkout.manualCode')}
                </span>
                <button
                  type="button"
                  onClick={() => copyLpa(qrOpen.qrLpa!)}
                  className="inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-[var(--color-violet)] transition cursor-pointer"
                >
                  <span className="break-all">{qrOpen.qrLpa}</span>
                  {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                </button>
              </div>
              {qrOpen.iosTapLink && (
                <a href={qrOpen.iosTapLink} className="inline-block text-xs font-bold text-[var(--color-violet)] underline">
                   {t('account.iosInstall')}
                </a>
              )}
              <p className="text-[11px] text-slate-500">{t('checkout.scanInstruction')}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
