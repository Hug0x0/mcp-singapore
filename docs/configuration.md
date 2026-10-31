# Configuration and results

Configuration is read at startup. Invalid values are rejected without printing their contents. Node.js 22.12 or later is required; CI tests Node 22 and 24.

| Variable | Default | Purpose |
|---|---:|---|
| MCP_SG_OUTPUT_BYTES | 120000 | MCP output budget; JSON is never silently cut |
| MCP_SG_HTTP_BYTES | 8388608 | Maximum upstream JSON response size |
| MCP_SG_CACHE_BYTES | 20971520 | Budget for cached response values |
| MCP_SG_CACHE_ENTRIES | 128 | Maximum cache entry count |
| MCP_SG_CACHE_TTL_SECONDS | unset | Override tool-specific TTLs; 0 disables caching |
| MCP_SG_TIMEOUT_MS | 30000 | Total HTTP deadline including rate waits and retries |
| MCP_SG_QUEUE_LIMIT | 50 | Maximum concurrent rate-limit waits |
| MCP_SG_QUEUE_WAIT_MS | 20000 | Maximum wait before QUEUE_FULL |
| DATA_GOV_SG_TIER | public | public/dev/prod; dev and prod require a data.gov.sg key |
| MCP_SG_STALE_DAYS | 730 | Publication-age warning threshold |

Provider quotas still apply and may change. A higher tier is never inferred from the presence of a key. Public transport v1 feeds retain a conservative rate independent of the v2 tier.

Successful results expose `ok`, `served_at`, `data`, and `sources`. Each HTTP source includes `source_url`, `fetched_at`, `cache_hit`, and `age_seconds`. Emission time is distinct from download time and provider observation time. Caches are local to a server process.

`structuredContent` and JSON text represent the same result. Errors include `ok:false`, `error_code`, a message, and optional provider, HTTP status, and retry delay. Argument validation performed by the SDK may use its standard MCP error format.

Error codes: INVALID_ARGUMENT, AUTH_REQUIRED, AUTH_FAILED, RATE_LIMITED, UPSTREAM_UNAVAILABLE, UPSTREAM_ERROR, INVALID_RESPONSE, NETWORK_TIMEOUT, CANCELLED, QUEUE_FULL, OUTPUT_TOO_LARGE, INCOMPLETE_DATA, EXPORT_PENDING, NOT_FOUND.

For oversized output, reduce limits or projections, add filters, or use an export. Caches are bounded by response bytes and entry count and are purged after expiration. Diagnostics never include credential values or sensitive headers.
