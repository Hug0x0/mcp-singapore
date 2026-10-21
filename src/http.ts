import { setTimeout as delay } from 'node:timers/promises';

const ALLOWED_HOSTS = new Set(['api-production.data.gov.sg', 'api-open.data.gov.sg', 'api.data.gov.sg', 'data.gov.sg', 'tablebuilder.singstat.gov.sg', 'datamall2.mytransport.sg', 'www.onemap.gov.sg', 'api.worldbank.org']);
export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly retryAfterSeconds?: number) { super(message); }
}
interface Options { headers?: Record<string, string>; ttlMs?: number; intervalMs?: number; rateGroup?: string }
interface Cached { expires: number; value: unknown }
export class HttpClient {
  private cache = new Map<string, Cached>();
  private pending = new Map<string, Promise<unknown>>();
  private nextRequest = new Map<string, number>();
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 25000) {}

  async get<T>(url: URL | string, options: Options = {}): Promise<T> {
    const target = new URL(url);
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname) || target.username || target.password || (target.port && target.port !== '443')) throw new ApiError('Unsupported API origin');
    // Cache is process-local; headers never appear in logs or MCP output.
    const key = JSON.stringify([target.href, options.headers ?? {}]);
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as T;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<T>;
    const operation = this.request<T>(target, options).then(value => {
      if (options.ttlMs) {
        if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, { value, expires: Date.now() + options.ttlMs });
      }
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, operation);
    return operation;
  }

  private async request<T>(url: URL, options: Options): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (options.intervalMs) {
        const group = options.rateGroup ?? url.hostname;
        const now = Date.now();
        const reserved = Math.max(now, this.nextRequest.get(group) ?? now);
        this.nextRequest.set(group, reserved + options.intervalMs);
        if (reserved > now) await delay(reserved - now);
      }
      let response: Response;
      try {
        response = await this.fetcher(url, { headers: { Accept: 'application/json', 'User-Agent': 'mcp-singapore/0.1.0', ...options.headers }, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) });
      } catch (error) {
        if (attempt < 2 && !(error instanceof Error && /Timeout|Abort/.test(error.name))) { await delay(300 * (attempt + 1)); continue; }
        throw new ApiError(`Unable to reach ${url.hostname}: network failure or timeout`);
      }
      if (!response.ok) {
        const retryHeader = response.headers.get('retry-after');
        const parsedRetry = retryHeader ? (/^\d+$/.test(retryHeader) ? Number(retryHeader) : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000)) : NaN;
        const retry = Number.isFinite(parsedRetry) ? Math.max(0, parsedRetry) : 10;
        await response.body?.cancel();
        if ((response.status === 429 || response.status >= 500) && attempt < 2 && retry <= 10) { await delay(response.status === 429 ? retry * 1000 : 400 * (attempt + 1)); continue; }
        throw new ApiError(`Upstream ${url.hostname} returned HTTP ${response.status}${response.status === 429 ? '; quota exceeded, retry later or configure an API key' : ''}`, response.status, response.status === 429 ? retry : undefined);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new ApiError('Empty API response');
      const chunks: Uint8Array[] = []; let size = 0;
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength;
        if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new ApiError('API response exceeds 8 MiB; use narrower filters or the dataset download tool'); }
        chunks.push(part.value);
      }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new ApiError(`Invalid JSON from ${url.hostname}`); }
      if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (b.success === false || (typeof b.code === 'number' && b.code !== 0) || (typeof b.StatusCode === 'number' && b.StatusCode !== 200)) throw new ApiError(`Upstream ${url.hostname} reported an application error`);
      }
      return body as T;
    }
    throw new ApiError('Request failed');
  }
}
export const http = new HttpClient();
export function url(base: string, params: Record<string, unknown> = {}): URL {
  const result = new URL(base);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') result.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  return result;
}
export function dataGovHeaders(): Record<string, string> { return process.env.DATA_GOV_SG_API_KEY ? { 'x-api-key': process.env.DATA_GOV_SG_API_KEY } : {}; }
