import { AsyncLocalStorage } from 'node:async_hooks';
export interface Provenance { source_url: string; fetched_at: string; cache_hit: boolean; age_seconds: number }
export const requestContext = new AsyncLocalStorage<{ signal?: AbortSignal; sources: Provenance[] }>();
export function recordSource(source: Provenance) { const ctx=requestContext.getStore(); if(ctx){const index=ctx.sources.findIndex(s=>s.source_url===source.source_url);if(index>=0)ctx.sources[index]=source;else ctx.sources.push(source);} }
