'use client';

import { useState, useEffect } from 'react';
import { Plan } from '@/lib/types';
import { 
  X, CreditCard, Lock, Mail, User, CheckCircle, 
  Loader2, AlertCircle, Phone, Info, Globe, ShieldCheck, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  destinationName: string;
  destinationFlag: string;
  destinationCode?: string;
}

export default function CheckoutModal({ isOpen, onClose, plan, destinationName, destinationFlag, destinationCode }: CheckoutModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [loadingText, setLoadingText] = useState(t('checkout.processingSteps.0'));
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [orderNumber, setOrderNumber] = useState(0);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        setStep('form');
        setEmail('');
        setName('');
        setCardNumber('');
        setExpiry('');
        setCvc('');
        setPhone('');
        setErrors({});
        setOrderNumber(Math.floor(100000 + Math.random() * 900000));
      });
    }
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.substring(0, 16);
    const matched = val.match(/.{1,4}/g);
    setCardNumber(matched ? matched.join(' ') : val);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length > 2) {
      setExpiry(`${val.substring(0, 2)}/${val.substring(2)}`);
    } else {
      setExpiry(val);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 4) setCvc(val);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!email) newErrors.email = 'El correo electrónico es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Formato de correo inválido';
    
    if (!name) newErrors.name = 'El nombre completo es obligatorio';
    if (!phone) newErrors.phone = 'El teléfono de contacto es obligatorio';

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (!cleanCard) newErrors.card = 'El número de tarjeta es obligatorio';
    else if (cleanCard.length < 15) newErrors.card = 'Número de tarjeta inválido';

    if (!expiry) newErrors.expiry = 'Obligatorio';
    else if (!/^\d{2}\/\d{2}$/.test(expiry)) newErrors.expiry = 'Formato MM/AA';

    if (!cvc) newErrors.cvc = 'Obligatorio';
    else if (cvc.length < 3) newErrors.cvc = 'Mín. 3 dig.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStep('processing');
    
    // Simular pasos de aprobación de Stripe
    const steps = [
      { t: t('checkout.processingSteps.0'), delay: 1200 },
      { t: t('checkout.processingSteps.1'), delay: 2405 },
      { t: t('checkout.processingSteps.2'), delay: 3605 },
      { t: t('checkout.processingSteps.3'), delay: 4805 },
      { t: t('checkout.processingSteps.4'), delay: 5805 }
    ];

    steps.forEach((s) => {
      setTimeout(() => {
        setLoadingText(s.t);
      }, s.delay);
    });

    setTimeout(() => {
      setStep('success');
    }, 6200);
  };

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

          {/* Form Step */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 scrollbar-thin">
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
                  <div className="text-[10px] sm:text-xs text-slate-400 line-through font-sans">$ {Math.round(plan.priceUSD * 1.25)} USD</div>
                  <div className="text-slate-900 font-sans font-bold text-base sm:text-xl">
                    ${plan.priceUSD} <span className="text-[10px] sm:text-xs font-normal text-slate-500">USD</span>
                  </div>
                </div>
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
                        onChange={handlePhoneChange}
                        placeholder="+54 9 11 1234 5678"
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200"
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('checkout.paymentInfo')}</h4>
                  <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[var(--color-violet)] font-bold uppercase tracking-wide">
                    <Lock className="h-3 w-3" /> {t('checkout.secureSSL')}
                  </span>
                </div>

                {/* Simulated Stripe Credit Card elements */}
                <div className="rounded-xl border border-slate-200 p-3 sm:p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <label htmlFor="checkout-card" className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1">{t('checkout.cardNumber')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <input
                        id="checkout-card"
                        type="text"
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200 bg-white"
                      />
                    </div>
                    {errors.card && <p className="text-red-500 text-[10px] mt-1">{errors.card}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="checkout-expiry" className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1">{t('checkout.expiry')}</label>
                      <input
                        id="checkout-expiry"
                        type="text"
                        required
                        value={expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/AA"
                        className="w-full px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200 bg-white text-center"
                      />
                      {errors.expiry && <p className="text-red-500 text-[10px] mt-1">{errors.expiry}</p>}
                    </div>
                    <div>
                      <label htmlFor="checkout-cvc" className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1">{t('checkout.cvc')}</label>
                      <input
                        id="checkout-cvc"
                        type="password"
                        required
                        value={cvc}
                        onChange={handleCvcChange}
                        placeholder="123"
                        className="w-full px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]/20 focus:border-[var(--color-violet)] border-slate-200 bg-white text-center"
                      />
                      {errors.cvc && <p className="text-red-500 text-[10px] mt-1">{errors.cvc}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings and Submit */}
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-105 p-3 text-[11px] text-yellow-800">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    {t('checkout.warning')}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-lime)] hover:bg-[var(--color-lime-vivid)] text-[var(--color-black)] font-black py-3 sm:py-4 px-4 shadow-md shadow-lime-600/15 transition-all font-sans text-xs sm:text-base cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('checkout.payBtn').replace('${price}', (plan.priceUSD).toString())}
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

          {/* Processing Loading Step */}
          {step === 'processing' && (
            <div className="p-6 sm:p-10 text-center flex flex-col items-center justify-center space-y-6 min-h-[300px] sm:min-h-[400px] overflow-y-auto flex-1">
              <div className="relative flex items-center justify-center shrink-0">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-[var(--color-lime)]/20 animate-pulse absolute" />
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--color-violet)] animate-spin relative" />
              </div>
              <div className="space-y-2">
                <h3 className="font-sans font-bold text-slate-900 text-base sm:text-lg">{t('checkout.processingTitle')}</h3>
                <p className="font-sans text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  {t('checkout.processingSub')}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 sm:px-4 sm:py-1.5 border border-slate-200 text-[10px] sm:text-xs text-slate-600 tracking-wide animate-bounce">
                {loadingText}
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6" id="success-view">
              <div className="text-center space-y-2 pb-1 shrink-0">
                <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[var(--color-lime)]/25 text-neutral-900">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3px]" />
                </div>
                <h3 className="font-sans font-extrabold text-slate-900 text-base sm:text-xl">{t('checkout.successTitle')}</h3>
                <p className="font-sans text-[11px] sm:text-sm text-slate-500 max-w-sm sm:max-w-md mx-auto">
                  {t('checkout.successSub')}
                </p>
              </div>

              {/* QR and Code Panel */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-center space-y-4 shrink-0">
                <div className="inline-block bg-white p-2.5 sm:p-3 rounded-xl border border-slate-150 shadow-inner">
                  {/* High quality visual QR code simulated via pure beautiful markup & geometric rendering */}
                  <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto flex flex-col justify-between p-1Hover:scale-105 transition-all duration-300">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-900">
                      {/* Fake stylized QR code matrix for beautiful design presentation */}
                      <path fill="currentColor" d="M0,0 h30 v10 h-20 v20 h-10 z M70,0 h30 v30 h-10 v-20 h-20 z M0,70 h10 v20 h20 v10 h-30 z M100,100 h-30 v-10 h20 v-20 h-10 z" />
                      {/* Inner block patterns */}
                      <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                      <rect x="80" y="80" width="10" height="10" fill="currentColor" />
                      <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                      <rect x="10" y="80" width="10" height="10" fill="currentColor" />
                      <rect x="35" y="35" width="30" height="30" fill="currentColor" />
                      <rect x="25" y="25" width="10" height="10" fill="currentColor" />
                      <rect x="65" y="65" width="10" height="10" fill="currentColor" />
                      <path fill="currentColor" d="M15,45 h10 v10 h-10 z M45,15 h10 v10 h-10 z M45,75 h10 v10 h-10 z M75,45 h10 v10 h-10 z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('checkout.manualCode')}</span>
                  <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-slate-700 shadow-sm overflow-x-auto max-w-full">
                    <span className="break-all">LPA:1$AURA-PLAY.COM$ESIM-{plan.id.toUpperCase()}</span>
                  </div>
                </div>

                <p className="text-[10px] sm:text-[11px] text-slate-500 max-w-xs mx-auto">
                  {t('checkout.scanInstruction')}
                </p>
              </div>

              {/* Instructions Steps */}
              <div className="space-y-3 shrink-0">
                <h4 className="font-sans text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--color-violet)] flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('checkout.installStepsTitle')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-lime)]/25 font-sans font-bold text-[11px] text-[var(--color-black)]">1</span>
                    <h5 className="font-sans font-bold text-xs text-slate-800">{t('checkout.step1Title')}</h5>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">
                      {t('checkout.step1Desc')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-lime)]/25 font-sans font-bold text-[11px] text-[var(--color-black)]">2</span>
                    <h5 className="font-sans font-bold text-xs text-slate-800">{t('checkout.step2Title')}</h5>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">
                      {t('checkout.step2Desc')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-lime)]/25 font-sans font-bold text-[11px] text-[var(--color-black)]">3</span>
                    <h5 className="font-sans font-bold text-xs text-slate-800">{t('checkout.step3Title')}</h5>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">
                      {t('checkout.step3Desc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legal confirmation footprint */}
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center text-[9px] sm:text-[10px] text-slate-400 gap-2 shrink-0">
                <span>{t('checkout.order')} <strong className="text-slate-600">#EST-{orderNumber}</strong></span>
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
