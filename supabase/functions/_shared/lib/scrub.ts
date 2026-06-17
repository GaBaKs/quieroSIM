/**
 * Redactado de secretos en texto libre (port de server/lib/logger.ts para Deno).
 * Cualquier mensaje de error o URL que pueda terminar en un log pasa por acá:
 * el token de YeSim viaja en query string y los QR/passport son secretos.
 */

const REDACTED = '[REDACTED]';

const SENSITIVE_PATTERNS: RegExp[] = [
  /([?&](?:token|key|api_key|apikey)=)[^&\s"']+/gi, // token YeSim en query string
  /LPA:1\$[^\s"']+/gi, // string de activación eSIM (QR)
  /https?:\/\/esimpass[^\s"']*/gi, // esim_passport (link tokenizado secreto)
  /\b(?:sk|pk|rk)_(?:test|live)_[A-Za-z0-9]+/g, // claves Stripe
  /\bwhsec_[A-Za-z0-9]+/g, // webhook secret Stripe
  /\bre_[A-Za-z0-9_]{10,}/g, // API key Resend
  /\bsb_(?:publishable|secret)_[A-Za-z0-9_]+/g, // claves Supabase
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, // JWT
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // emails
];

export function scrubText(value: string): string {
  let out = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, (match, prefix) =>
      typeof prefix === 'string' && match.startsWith(prefix) ? `${prefix}${REDACTED}` : REDACTED,
    );
  }
  return out;
}
