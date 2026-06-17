/**
 * Tipos del contrato YeSim Partner API (fuente: API YeSIM.md).
 * RAW = la forma EXACTA en que responde la API (números como strings, etc.).
 * Normalizados = lo que expone el cliente al resto del sistema.
 * ⚠️ `plan_id` es un hash hex de 32 chars (string); `old_id` es el legacy numérico.
 */

// ── Enums del contrato ───────────────────────────────────────────────────────

export type YesimStatusQr = 'Released' | 'Installed' | 'Enabled' | 'Disabled' | 'Deleted';
export type YesimPlanType = 'country' | 'region';
export type YesimCurrency = 'EUR' | 'USD';
export type YesimDeviceType = 'PHONE' | 'SMARTWATCH' | 'LAPTOP' | 'TABLET' | 'CAR';
export type YesimVoucherStatus = 'Available' | 'Redeemed' | 'Expired';

// ── RAW: formas exactas de la API ────────────────────────────────────────────

export interface RawYesimPlan {
  id: string; // hash hex 32 chars
  old_id: string | null; // legacy numérico, puede ser null
  name: string;
  days: string; // "1"
  price: string; // "0.39" — moneda de la cuenta de partner
  data: string; // "0.49" en GB
  countries_included: string;
  countryIso2: string;
  mcc: string;
  iso3: string;
  operators: string;
  image: string;
  apn: string;
  plan_type: YesimPlanType;
  currency: YesimCurrency;
  data_unit: string; // "GB"
  retail_price: string;
}

export interface RawYesimNetworkInfo {
  time: string;
  lastMcc: number;
  lastMnc: number;
  lastRat: string; // "4G - LTE"
}

export interface RawYesimEsim {
  id: string;
  iccid: string; // 19 dígitos
  user_id: string;
  created_at: string; // "YYYY-MM-DD HH:MM:SS" UTC+0
  active_plan_id: string | null;
  plan_activated_at: string | null;
  plan_expired_at: string | null;
  qrcode: string; // "LPA:1$smdp.io$..." — SECRETO
  status_qr: YesimStatusQr;
  imsi: string;
  msisdn: string | null;
  is_deleted: string; // "0" | "1"
  data_left_mb?: number; // floats, solo tras activación
  data_package_mb?: number;
  data_used_mb?: number;
  img?: string; // "data:image/png;base64,..." — SECRETO
  ios_tap_link?: string;
  esim_passport?: string; // link tokenizado — SECRETO
  is_voucher: boolean;
  voucher_status?: YesimVoucherStatus;
  voucher_code?: string;
  networkinfo?: RawYesimNetworkInfo;
}

export interface RawYesimUser {
  id: string;
  email: string;
  created_at: string;
  esim_change_count: string; // máx. 3 reemplazos por cuenta
  batch_id: string | null;
  stripe_user_id: string | null;
  esims: RawYesimEsim[];
}

export interface RawYesimOrder {
  id: string;
  user_id: string;
  iccid: string;
  plan_id: string;
  cost_eur: string; // SIEMPRE EUR según ejemplos del doc
  created_at: string;
  payment_id: string | null;
}

export interface RawSupportedDeviceCategory {
  type: YesimDeviceType;
  brands: Array<{ brand: string; models: Array<{ model: string }> }>;
}

export interface RawAllowedOperator {
  id: string;
  country: string;
  operator: string;
  tadig: string;
  location_zone: string;
  created_at: string;
  updated_at: string;
}

export interface RawBulkSimInfoResponse {
  data: Array<RawYesimEsim & { status: string | null; error: string | null }>;
  pagination: { page: number; per_page: number; total: number; total_pages: number; returned: number };
  summary: { found: number; failed: number };
}

// ── Webhooks salientes de YeSim (SIN firma — tratar como señal no confiable) ─

export interface YesimEsimStatusEvent {
  type: 'EsimStatus';
  iccid: string;
  status: Exclude<YesimStatusQr, 'Released'>; // Enabled|Disabled|Installed|Deleted
}

export interface YesimPackageUsageEvent {
  type: 'PackageUsage';
  iccid: string;
  unitsBefore: number;
  unitsAfter: number;
  thresholdPercentage: 50 | 90;
}

export type YesimWebhookEvent = YesimEsimStatusEvent | YesimPackageUsageEvent;

// ── Normalizados: lo que expone el cliente ───────────────────────────────────

export interface YesimPlan {
  id: string; // hash — NUNCA tratar como número
  oldId: number | null;
  name: string;
  days: number;
  price: number; // en `currency` de la cuenta
  dataGb: number;
  countriesIncluded: string;
  countryIso2: string;
  iso3: string;
  operators: string;
  image: string;
  apn: string;
  planType: YesimPlanType;
  currency: YesimCurrency;
  retailPrice: number;
}

export interface YesimEsim {
  id: string;
  iccid: string;
  userId: string;
  createdAt: string;
  activePlanId: string | null;
  planActivatedAt: string | null;
  planExpiredAt: string | null;
  qrcode: string;
  statusQr: YesimStatusQr;
  imsi: string;
  msisdn: string | null;
  isDeleted: boolean;
  dataLeftMb: number | null;
  dataPackageMb: number | null;
  dataUsedMb: number | null;
  img: string | null;
  iosTapLink: string | null;
  esimPassport: string | null;
  isVoucher: boolean;
  voucherStatus: YesimVoucherStatus | null;
  voucherCode: string | null;
  networkInfo: RawYesimNetworkInfo | null;
}

export interface YesimUser {
  id: string;
  email: string;
  createdAt: string;
  esimChangeCount: number;
  esims: YesimEsim[];
}

export interface YesimOrder {
  id: string;
  userId: string;
  iccid: string;
  planId: string;
  costEur: number;
  createdAt: string;
  paymentId: string | null;
}

export interface BulkSimInfoResult {
  esims: Array<{ esim: YesimEsim | null; iccid: string; error: string | null }>;
  pagination: RawBulkSimInfoResponse['pagination'];
  summary: RawBulkSimInfoResponse['summary'];
}

// ── Normalizadores ───────────────────────────────────────────────────────────

export function normalizePlan(raw: RawYesimPlan): YesimPlan {
  return {
    id: raw.id,
    oldId: raw.old_id === null ? null : Number(raw.old_id),
    name: raw.name,
    days: Number(raw.days),
    price: Number(raw.price),
    dataGb: Number(raw.data),
    countriesIncluded: raw.countries_included,
    countryIso2: raw.countryIso2,
    iso3: raw.iso3,
    operators: raw.operators,
    image: raw.image,
    apn: raw.apn,
    planType: raw.plan_type,
    currency: raw.currency,
    retailPrice: Number(raw.retail_price),
  };
}

export function normalizeEsim(raw: RawYesimEsim): YesimEsim {
  return {
    id: raw.id,
    iccid: raw.iccid,
    userId: raw.user_id,
    createdAt: raw.created_at,
    activePlanId: raw.active_plan_id,
    planActivatedAt: raw.plan_activated_at,
    planExpiredAt: raw.plan_expired_at,
    qrcode: raw.qrcode,
    statusQr: raw.status_qr,
    imsi: raw.imsi,
    msisdn: raw.msisdn ?? null,
    isDeleted: raw.is_deleted === '1',
    dataLeftMb: raw.data_left_mb ?? null,
    dataPackageMb: raw.data_package_mb ?? null,
    dataUsedMb: raw.data_used_mb ?? null,
    img: raw.img ?? null,
    iosTapLink: raw.ios_tap_link ?? null,
    esimPassport: raw.esim_passport ?? null,
    isVoucher: raw.is_voucher,
    voucherStatus: raw.voucher_status ?? null,
    voucherCode: raw.voucher_code ?? null,
    networkInfo: raw.networkinfo ?? null,
  };
}

export function normalizeUser(raw: RawYesimUser): YesimUser {
  return {
    id: raw.id,
    email: raw.email,
    createdAt: raw.created_at,
    esimChangeCount: Number(raw.esim_change_count),
    esims: raw.esims.map(normalizeEsim),
  };
}

export function normalizeOrder(raw: RawYesimOrder): YesimOrder {
  return {
    id: raw.id,
    userId: raw.user_id,
    iccid: raw.iccid,
    planId: raw.plan_id,
    costEur: Number(raw.cost_eur),
    createdAt: raw.created_at,
    paymentId: raw.payment_id ?? null,
  };
}
