import { AsyncLocalStorage } from 'node:async_hooks';
export interface Provenance { source_url: string; fetched_at: string; cache_hit: boolean; age_seconds: number }
export const requestContext = new AsyncLocalStorage<{ signal?: AbortSignal; sources: Provenance[] }>();
export function recordSource(source: Provenance) { const ctx=requestContext.getStore(); if(ctx && !ctx.sources.some(s=>s.source_url===source.source_url))ctx.sources.push(source); }
