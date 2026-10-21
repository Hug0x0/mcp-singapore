export interface Config { outputBytes: number; httpBytes: number; cacheBytes: number; cacheEntries: number; cacheTtlMs?: number; timeoutMs: number; queueLimit: number; queueWaitMs: number; tier: 'public'|'dev'|'prod'; staleDays: number }
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const num = (name: string, fallback: number, min: number, max: number) => { const v = env[name] === undefined ? fallback : Number(env[name]); if (!Number.isInteger(v) || v < min || v > max) throw new Error(`Invalid configuration: ${name}`); return v; };
  const tier = env.DATA_GOV_SG_TIER ?? 'public';
  if (!['public','dev','prod'].includes(tier)) throw new Error('Invalid configuration: DATA_GOV_SG_TIER');
  if (tier !== 'public' && !env.DATA_GOV_SG_API_KEY) throw new Error('DATA_GOV_SG_TIER requires DATA_GOV_SG_API_KEY');
  return { outputBytes:num('MCP_SG_OUTPUT_BYTES',120000,4096,2000000),httpBytes:num('MCP_SG_HTTP_BYTES',8388608,1024,67108864),cacheBytes:num('MCP_SG_CACHE_BYTES',20971520,1024,134217728),cacheEntries:num('MCP_SG_CACHE_ENTRIES',128,1,1024),cacheTtlMs:env.MCP_SG_CACHE_TTL_SECONDS===undefined?undefined:num('MCP_SG_CACHE_TTL_SECONDS',60,0,86400)*1000,timeoutMs:num('MCP_SG_TIMEOUT_MS',30000,10,120000),queueLimit:num('MCP_SG_QUEUE_LIMIT',50,1,1000),queueWaitMs:num('MCP_SG_QUEUE_WAIT_MS',20000,0,60000),tier:tier as Config['tier'],staleDays:num('MCP_SG_STALE_DAYS',730,1,36500) };
}
export const config = loadConfig();
export function intervalFor(group: string, tier = config.tier): number {
  const rates = { public:{datastore:2700,realtime:1800,downloads:5500,transport:2700},dev:{datastore:1400,realtime:950,downloads:2800,transport:2700},prod:{datastore:600,realtime:400,downloads:1200,transport:2700} };
  return rates[tier][group as keyof typeof rates.public] ?? 0;
}
