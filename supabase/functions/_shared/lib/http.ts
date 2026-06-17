import { scrubText } from './scrub.ts';

/**
 * fetch JSON con timeout, reintentos con backoff exponencial + jitter, y
 * scrubbing de secretos en todo error. Reintenta SOLO ante fallo de red,
 * timeout o 5xx (transitorios); un 4xx es definitivo y no se reintenta.
 */

export type HttpFailureKind = 'http' | 'network' | 'timeout';

export class HttpFailure extends Error {
  readonly kind: HttpFailureKind;
  readonly status?: number;
  /** Cuerpo JSON (o texto) de la respuesta de error, si lo hubo. Ya scrubbed. */
  readonly body?: unknown;

  constructor(kind: HttpFailureKind, message: string, opts?: { status?: number; body?: unknown }) {
    super(scrubText(message));
    this.name = 'HttpFailure';
    this.kind = kind;
    this.status = opts?.status;
    this.body = opts?.body;
  }
}

export interface FetchJsonOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  /** Reintentos ADICIONALES al primer intento (default 2 → hasta 3 llamadas). */
  maxRetries?: number;
  /** Base del backoff exponencial (default 300ms; usar 1 en tests). */
  retryBaseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(e: HttpFailure): boolean {
  return e.kind === 'network' || e.kind === 'timeout' || (e.kind === 'http' && (e.status ?? 0) >= 500);
}

async function attemptFetch(url: string, opts: FetchJsonOptions): Promise<unknown> {
  const fetchFn = opts.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: opts.method ?? 'GET',
      headers: opts.headers,
      body: opts.body,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new HttpFailure('timeout', `Timeout tras ${timeoutMs}ms llamando ${url}`);
    }
    throw new HttpFailure('network', `Fallo de red llamando ${url}: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text.length ? JSON.parse(text) : null;
  } catch {
    // cuerpo no-JSON: queda como texto
  }

  if (!response.ok) {
    throw new HttpFailure('http', `HTTP ${response.status} llamando ${url}`, {
      status: response.status,
      body: typeof parsed === 'string' ? scrubText(parsed) : parsed,
    });
  }

  return parsed;
}

export async function fetchJson(url: string, opts: FetchJsonOptions = {}): Promise<unknown> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelay = opts.retryBaseDelayMs ?? 300;

  let lastError: HttpFailure | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await attemptFetch(url, opts);
    } catch (e) {
      const failure = e instanceof HttpFailure ? e : new HttpFailure('network', String(e));
      lastError = failure;
      if (!isRetryable(failure) || attempt === maxRetries) throw failure;
      const delay = baseDelay * 2 ** attempt + Math.random() * baseDelay;
      await sleep(delay);
    }
  }
  /* istanbul ignore next -- inalcanzable */
  throw lastError ?? new HttpFailure('network', 'fetchJson: estado imposible');
}
