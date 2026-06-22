'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Plan } from '@/lib/types';
import {
  X, Lock, Mail, User, Loader2, AlertCircle, Phone, Info, Globe, ShieldCheck, Check, Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { QRCodeSVG } from 'qrcode.react';
import { createCheckout, getOrderStatus, previewCoupon, type CheckoutSession, type OrderStatusInfo } from '@/server/actions/checkout';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  destinationName: string;
  destinationFlag: string;
  destinationCode?: string;
}

// Singleton: loadStripe solo una vez por sesión de navegador.
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type Step = 'form' | 'payment' | 'processing' | 'success';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 24; // ~60s; después mostramos "puede demorar" (§5.4, sin tono de error)

export default function CheckoutModal({ isOpen, onClose, plan, destinationName, destinationFlag, destinationCode }: CheckoutModalProps) {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderStatusInfo | null>(null);
  const [delayed, setDelayed] = useState(false);
  const [copied, setCopied] = useState(false);
  // Cupón (Etapa 8A)
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const pollCount = useRef(0);

  // ¿El comprador NO tiene sesión? Si tiene cuenta, conviene loguearse para que
  // la compra quede vinculada (si no, queda como guest y hay que reclamarla).
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setIsGuest(!data.user);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        setStep('form');
        setEmail('');
        setName('');
        setPhone('');
        setAcceptTerms(false);
        setErrors({});
        setSubmitting(false);
        setSession(null);
        setOrderInfo(null);
        setDelayed(false);
        setCopied(false);
        setCouponInput('');
        setApplied(null);
        setCouponError(null);
        setCouponLoading(false);
        pollCount.current = 0;
      });
    }
  }, [isOpen]);

  // Polling del estado de la orden tras el pago (la provisión corre server-side).
  useEffect(() => {
    if (step !== 'processing' || !session) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      pollCount.current += 1;
      try {
        const result = await getOrderStatus({ orderId: session.orderId, email });
        if (cancelled) return;
        if (result.ok) {
          setOrderInfo(result.data);
          if (result.data.orderStatus === 'fulfilled' && result.data.esim) {
            setStep('success');
            return;
          }
          if (result.data.orderStatus === 'failed_needs_review') {
            setDelayed(true);
            setStep('success');
            return;
          }
        }
      } catch {
        // Red caída o server inalcanzable: contamos el intento y reintentamos
        // en el próximo tick — jamás una promesa rota en consola.
      }
      if (cancelled) return;
      if (pollCount.current >= POLL_MAX_ATTEMPTS) {
        setDelayed(true);
        setStep('success');
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    const timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, session, email]);

  if (!isOpen || !plan) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!email) newErrors.email = t('checkout.errEmailRequired');
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('checkout.errEmailFormat');
    if (!name || name.trim().length < 2) newErrors.name = t('checkout.errName');
    if (!phone || phone.trim().length < 5) newErrors.phone = t('checkout.errPhone');
    if (!acceptTerms) newErrors.terms = t('checkout.errTerms');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);
    const result = await previewCoupon({ code, planId: plan.id });
    setCouponLoading(false);
    if (result.ok) {
      setApplied({ code: code.toUpperCase(), discount: result.data.discount });
    } else {
      setApplied(null);
      setCouponError(result.error.message);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    const result = await createCheckout({
      planId: plan.id,
      email,
      fullName: name,
      phone,
      acceptTerms: true,
      lang, // idioma del email con el QR
      couponCode: applied?.code, // cupón aplicado (se revalida server-side)
    });
    setSubmitting(false);
    if (!result.ok) {
      setErrors({ general: result.error.message });
      return;
    }
    setSession(result.data);
    setStep('payment');
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

  const orderShortId = session ? session.orderId.slice(0, 8).toUpperCase() : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm" id="checkout-gateway-container">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          className="relative w-full max-w-xl max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-150 bg-white shadow-2xl"
          id="checkout-inner-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="flex items-center gap-2">
              {destinationCode && destinationCode.length <= 2 ? (
                <img
                  src={`https://flagcdn.com/w80/${destinationCode.toLowerCase()}.png`}
                  alt={destinationName}
                  className="h-4 w-6 sm:h-5 sm:w-7 object-cover rounded shadow-sm shrink-0 border border-slate-200 select-none"
                />
              ) : (
                <span className="text-xl">{destinationFlag}</span>
              )}
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-sm sm:text-base">{t('checkout.title')}</h3>
                <p className="font-sans text-[10px] sm:text-xs text-slate-500">{destinationName} · {plan.dataGB} · {plan.days} {t('destinations.days').toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Step 1: datos de entrega + T&C */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 scrollbar-thin">
              {isGuest && (
                <div className="rounded-xl bg-[var(--color-violet)]/[0.06] border border-[var(--color-violet)]/15 p-3 text-[11px] sm:text-xs text-slate-600">
                  {t('checkout.guestHint')}{' '}
                  <Link
                    href={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                    className="font-bold text-[var(--color-violet)] hover:underline"
                  >
                    {t('checkout.guestHintCta')}
                  </Link>
                </div>
              )}

              {/* Product Review Card */}
              <div className="rounded-xl bg-[var(--color-violet)]/[0.04] border border-[var(--color-violet)]/11 p-3 sm:p-4 flex justify-between items-center">
                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-wide text-[var(--color-violet)] bg-[var(--color-violet)]/10 rounded px-1.5 py-0.5 mb-1">
                    {t('checkout.selectedPlan')}
                  </span>
                  <div className="text-slate-900 font-bold text-xs sm:text-base">
                    eSIM {destinationName} {plan.dataGB}
                  </div>
                  <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5">
                    {t('checkout.validFor').replace('{days}', plan.days.toString())}
                  </div>
                </div>
                <div className="text-right">
                  {applied ? (
                    <>
                      <div className="text-[10px] sm:text-xs text-slate-400 line-through font-sans">${plan.priceUSD} USD</div>
                      <div className="text-slate-900 font-sans font-bold text-base sm:text-xl">
                        ${Math.max(0, plan.priceUSD - applied.discount).toFixed(2)} <span className="text-[10px] sm:text-xs font-normal text-slate-500">USD</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] sm:text-xs text-slate-400 line-through font-sans">$ {Math.round(plan.priceUSD * 1.25)} USD</div>
                      <div className="text-slate-900 font-sans font-bold text-base sm:text-xl">
                        ${plan.priceUSD} <span className="text-[10px] sm:text-xs font-normal text-slate-500">USD</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Cupón (Etapa 8A) */}
              <div className="space-y-1.5">
                {applied ? (
                  <div className="flex items-center justify-between rounded-xl border border-[var(--color-lime)]/40 bg-[var(--color-lime)]/10 px-3 py-2">
                    <span className="text-[11px] sm:text-xs font-bold text-green-800 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> {t('checkout.couponApplied').replace('{code}', applied.code).replace('{amount}', applied.discount.toFixed(2))}
                    </span>
                    <button type="button" onClick={removeCoupon} className="text-[11px] font-bold text-slate-500 hover:text-red-500 transition">
                      {t('checkout.couponRemove')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value); setCouponError(null); }}
                      placeholder={t('checkout.couponPlaceholder')}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm border rounded-lg uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="shrink-0 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 text-xs sm:text-sm font-bold text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t('checkout.couponApply')}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-red-500 text-[10px] flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {couponError}</p>}
              </div>

              <div className="space-y-3">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('checkout.deliveryInfo')}</h4>

                {/* Email Field */}
                <div>
                  <label htmlFor="checkout-email" className="block text-[11px] sm:text-xs font-medium text-slate-600 mb-1">
                    {t('checkout.email')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tunombre@viaje.com"
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.email}</p>}
                  <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{t('checkout.emailHelp')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Name field */}
                  <div>
                    <label htmlFor="checkout-name" className="block text-[11px] sm:text-xs font-medium text-slate-600 mb-1">
                      {t('checkout.name')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        id="checkout-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200"
                      />
                    </div>
                    {errors.name && <p className="text-red-500 text-[10px] mt-1">{errors.name}</p>}
                  </div>

                  {/* Phone field */}
                  <div>
                    <label htmlFor="checkout-phone" className="block text-[11px] sm:text-xs font-medium text-slate-600 mb-1">
                      {t('checkout.phone')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        id="checkout-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+54 9 11 1234 5678"
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200"
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* T&C (RF-LEG-01): sin aceptación no hay cobro */}
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[var(--color-violet)]"
                  />
                  <span className="text-[11px] sm:text-xs text-slate-600 leading-snug">
                    {t('checkout.termsPrefix')}{' '}
                    <a href="/terms-of-service" target="_blank" className="font-bold text-[var(--color-violet)] underline">{t('checkout.termsLink')}</a>{' '}
                    {t('checkout.termsAnd')}{' '}
                    <a href="/refund-policy" target="_blank" className="font-bold text-[var(--color-violet)] underline">{t('checkout.refundLink')}</a>.
                  </span>
                </label>
                {errors.terms && <p className="text-red-500 text-[10px] flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.terms}</p>}
              </div>

              {/* Warnings and Submit */}
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-105 p-3 text-[11px] text-yellow-800">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>{t('checkout.warning')}</p>
                </div>

                {errors.general && (
                  <p className="text-red-500 text-[11px] flex items-center gap-1 rounded-lg bg-red-50 border border-red-100 p-3">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errors.general}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-lime)] hover:bg-[var(--color-lime-vivid)] text-[var(--color-black)] font-black py-3 sm:py-4 px-4 shadow-md shadow-lime-600/15 transition-all font-sans text-xs sm:text-base cursor-pointer disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
                  {submitting ? t('checkout.preparing') : t('checkout.continueBtn')}
                </button>

                {/* Footer security logos */}
                <div className="flex items-center justify-center gap-3 text-[9px] sm:text-[10px] text-slate-400 font-sans pt-1 flex-wrap">
                  <span>🔒 Transacción Protegida</span>
                  <span>•</span>
                  <span>VISA</span>
                  <span>•</span>
                  <span>MASTERCARD</span>
                  <span>•</span>
                  <span>AMEX</span>
                  <span>•</span>
                  <span>STRIPE</span>
                </div>
              </div>
            </form>
          )}

          {/* Step 2: pago con Stripe Payment Element */}
          {step === 'payment' && session && stripePromise && (
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('checkout.paymentInfo')}</h4>
                <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[var(--color-violet)] font-bold uppercase tracking-wide">
                  <Lock className="h-3 w-3" /> {t('checkout.secureSSL')}
                </span>
              </div>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: session.clientSecret,
                  appearance: { theme: 'stripe', variables: { colorPrimary: '#9933c1', borderRadius: '12px' } },
                }}
              >
                <PaymentForm amountUsd={session.amountUsd} onPaid={() => setStep('processing')} />
              </Elements>
            </div>
          )}

          {/* Step 3: pago confirmado, emitiendo la eSIM */}
          {step === 'processing' && (
            <div className="p-6 sm:p-10 text-center flex flex-col items-center justify-center space-y-6 min-h-[300px] sm:min-h-[400px] overflow-y-auto flex-1">
              <div className="relative flex items-center justify-center shrink-0">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-[var(--color-lime)]/20 animate-pulse absolute" />
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--color-violet)] animate-spin relative" />
              </div>
              <div className="space-y-2">
                <h3 className="font-sans font-bold text-slate-900 text-base sm:text-lg">{t('checkout.emittingTitle')}</h3>
                <p className="font-sans text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  {t('checkout.emittingSub')}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 sm:px-4 sm:py-1.5 border border-slate-200 text-[10px] sm:text-xs text-slate-600 tracking-wide">
                {t('checkout.order')} <strong>#{orderShortId}</strong>
              </div>
            </div>
          )}

          {/* Step 4: éxito — QR real, o aviso de demora (§5.4: nunca tono de error) */}
          {step === 'success' && (
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6" id="success-view">
              <div className="text-center space-y-2 pb-1 shrink-0">
                <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[var(--color-lime)]/25 text-neutral-900">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3px]" />
                </div>
                <h3 className="font-sans font-extrabold text-slate-900 text-base sm:text-xl">
                  {orderInfo?.esim ? t('checkout.successTitle') : t('checkout.paidTitle')}
                </h3>
                <p className="font-sans text-[11px] sm:text-sm text-slate-500 max-w-sm sm:max-w-md mx-auto">
                  {orderInfo?.esim ? t('checkout.successSub') : t('checkout.paidDelayedSub')}
                </p>
              </div>

              {/* QR REAL de la eSIM emitida */}
              {orderInfo?.esim && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-center space-y-4 shrink-0">
                  <div className="inline-block bg-white p-2.5 sm:p-3 rounded-xl border border-slate-150 shadow-inner">
                    <QRCodeSVG value={orderInfo.esim.qrLpa} size={176} className="w-36 h-36 sm:w-44 sm:h-44 mx-auto" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('checkout.manualCode')}</span>
                    <button
                      type="button"
                      onClick={() => copyLpa(orderInfo.esim!.qrLpa)}
                      className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-slate-700 shadow-sm overflow-x-auto max-w-full hover:border-[var(--color-violet)] transition cursor-pointer"
                    >
                      <span className="break-all">{orderInfo.esim.qrLpa}</span>
                      {copied ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <Copy className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    </button>
                  </div>

                  {orderInfo.esim.iosTapLink && (
                    <a
                      href={orderInfo.esim.iosTapLink}
                      className="inline-block text-[11px] sm:text-xs font-bold text-[var(--color-violet)] underline"
                    >
                       Instalación con un toque (iPhone)
                    </a>
                  )}

                  <p className="text-[10px] sm:text-[11px] text-slate-500 max-w-xs mx-auto">
                    {t('checkout.scanInstruction')}
                  </p>
                </div>
              )}

              {/* Instructions Steps */}
              <div className="space-y-3 shrink-0">
                <h4 className="font-sans text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--color-violet)] flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('checkout.installStepsTitle')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-lime)]/25 font-sans font-bold text-[11px] text-[var(--color-black)]">1</span>
                    <h5 className="font-sans font-bold text-xs text-slate-800">{t('checkout.step1Title')}</h5>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">{t('checkout.step1Desc')}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-lime)]/25 font-sans font-bold text-[11px] text-[var(--color-black)]">2</span>
                    <h5 className="font-sans font-bold text-xs text-slate-800">{t('checkout.step2Title')}</h5>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">{t('checkout.step2Desc')}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-lime)]/25 font-sans font-bold text-[11px] text-[var(--color-black)]">3</span>
                    <h5 className="font-sans font-bold text-xs text-slate-800">{t('checkout.step3Title')}</h5>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">{t('checkout.step3Desc')}</p>
                  </div>
                </div>
              </div>

              {/* RF-CHK-02: ofrecer crear cuenta para gestionar la eSIM */}
              <div className="rounded-xl border border-[var(--color-violet)]/20 bg-[var(--color-violet)]/[0.04] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div>
                  <h5 className="font-sans font-bold text-xs sm:text-sm text-slate-800">{t('checkout.createAccountTitle')}</h5>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">{t('checkout.createAccountDesc')}</p>
                </div>
                <Link
                  href={`/register?email=${encodeURIComponent(email)}`}
                  className="shrink-0 rounded-full bg-[var(--color-violet)] hover:bg-[var(--color-violet-dark,#7100a5)] px-4 py-2 text-[11px] sm:text-xs font-bold text-white transition"
                >
                  {t('checkout.createAccountBtn')}
                </Link>
              </div>

              {/* Legal confirmation footprint */}
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center text-[9px] sm:text-[10px] text-slate-400 gap-2 shrink-0">
                <span>{t('checkout.order')} <strong className="text-slate-600">#{orderShortId}</strong></span>
                <span>{t('checkout.operatedBy')}</span>
                <button
                  onClick={onClose}
                  className="rounded bg-slate-900 px-3 py-1 font-bold text-white hover:bg-slate-800 transition text-[10px] sm:text-[11px] cursor-pointer"
                >
                  {t('checkout.understood')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Form interno del Payment Element (debe vivir dentro de <Elements>). */
function PaymentForm({ amountUsd, onPaid }: { amountUsd: number; onPaid: () => void }) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || paying) return;
    setPaying(true);
    setPayError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.origin },
    });

    if (error) {
      setPaying(false);
      setPayError(error.message ?? t('checkout.payError'));
      return;
    }
    onPaid();
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {payError && (
        <p className="text-red-500 text-[11px] flex items-center gap-1 rounded-lg bg-red-50 border border-red-100 p-3">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {payError}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-lime)] hover:bg-[var(--color-lime-vivid)] text-[var(--color-black)] font-black py-3 sm:py-4 px-4 shadow-md shadow-lime-600/15 transition-all font-sans text-xs sm:text-base cursor-pointer disabled:opacity-60"
      >
        {paying ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Lock className="h-4 w-4 sm:h-5 sm:w-5" />}
        {paying ? t('checkout.paying') : t('checkout.payBtn').replace('{price}', String(amountUsd))}
      </button>
    </form>
  );
}
