/**
 * Logger con scrubbing obligatorio (Plan Backend §2.9): jamás se registran
 * token YeSim, claves Stripe, QR/LPA, esim_passport ni PII del comprador.
 * Todo log pasa por scrub(); no usar console.* directo en el backend.
 */

const REDACTED = '[REDACTED]';

/** Claves cuyo valor se redacta siempre, sin importar el contenido. */
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|api[_-]?key|authorization|cookie|qr|lpa|passport|tap_link|card|cvc|cvv|expiry|email|phone|full_name|address|iccid/i;

/** Patrones sensibles dentro de strings (URLs con token, claves, QR, JWT). */
const SENSITIVE_STRING_PATTERNS: RegExp[] = [
  /([?&](?:token|key|api_key|apikey)=)[^&\s"']+/gi, // token YeSim en query string
  /LPA:1\$[^\s"']+/gi, // string de activación eSIM (QR)
  /\b(?:sk|pk|rk)_(?:test|live)_[A-Za-z0-9]+/g, // claves Stripe
  /\bwhsec_[A-Za-z0-9]+/g, // webhook secret Stripe
  /\bre_[A-Za-z0-9_]{10,}/g, // API key Resend
  /\bsb_(?:publishable|secret)_[A-Za-z0-9_]+/g, // claves Supabase
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, // JWT
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // emails en texto libre
];

function scrubString(value: string): string {
  let out = value;
  for (const pattern of SENSITIVE_STRING_PATTERNS) {
    out = out.replace(pattern, (match, prefix) =>
      typeof prefix === 'string' && match.startsWith(prefix) ? `${prefix}${REDACTED}` : REDACTED,
    );
  }
  return out;
}

/** Redacta recursivamente claves y strings sensibles. Seguro ante ciclos y profundidad. */
export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return { name: value.name, message: scrubString(value.message) };
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : scrub(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    level,
    ts: new Date().toISOString(),
    message: scrubString(message),
    ...(context ? { context: scrub(context) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
