export type ErrorCode = 'INVALID_ARGUMENT'|'AUTH_REQUIRED'|'AUTH_FAILED'|'RATE_LIMITED'|'UPSTREAM_UNAVAILABLE'|'UPSTREAM_ERROR'|'INVALID_RESPONSE'|'NETWORK_TIMEOUT'|'CANCELLED'|'QUEUE_FULL'|'OUTPUT_TOO_LARGE'|'INCOMPLETE_DATA'|'EXPORT_PENDING'|'NOT_FOUND';
export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly retryAfterSeconds?: number, public readonly code: ErrorCode = status===429?'RATE_LIMITED':status===401||status===403?'AUTH_FAILED':status===400?'INVALID_ARGUMENT':status&&status>=500?'UPSTREAM_UNAVAILABLE':'UPSTREAM_ERROR', public readonly provider?: string) { super(message); }
}
export function safeMessage(value: unknown): string {
  let text=typeof value==='string'?value:'Upstream application error';
  for(const key of ['DATA_GOV_SG_API_KEY','LTA_ACCOUNT_KEY','ONEMAP_TOKEN']) { const secret=process.env[key];if(secret)text=text.split(secret).join('[redacted]'); }
  return text.replace(/https?:\/\/\S+/g,'[upstream URL]').replace(/(?:bearer|token|password|api[_-]?key|accountkey)\s*[:= ]\s*\S+/gi,'[redacted]').slice(0,300);
}
