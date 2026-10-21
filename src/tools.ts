import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiError } from './http.js';
export interface Payload { source_url?: string; data: unknown; warnings?: string[]; [key: string]: unknown }
export function addTool<S extends z.ZodRawShape>(server: McpServer, name: string, description: string, shape: S, run: (args: z.infer<z.ZodObject<S>>) => Promise<Payload> | Payload): void {
  server.registerTool(name, { description, inputSchema: shape as z.ZodRawShape, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } }, async (args) => {
    try {
      const result = await run(args as z.infer<z.ZodObject<S>>);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ served_at: new Date().toISOString(), ...result }) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: error instanceof ApiError ? error.message : 'Unable to process upstream data', status: error instanceof ApiError ? error.status : undefined, retry_after_seconds: error instanceof ApiError ? error.retryAfterSeconds : undefined }) }] };
    }
  });
}
export const datasetId = z.string().regex(/^d_[a-f0-9]{32}$/);
export const resourceId = z.string().regex(/^[A-Za-z0-9]{1,24}$/);
export const limitSchema = z.number().int().min(1).max(100).default(20);
export const offsetSchema = z.number().int().min(0).max(10000000).default(0);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:[+]08:00)?)?$/).refine(v => { const day = new Date(v.slice(0, 10) + 'T00:00:00Z'); return !Number.isNaN(Date.parse(v)) && !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === v.slice(0, 10); }, 'Invalid date').optional().describe('Singapore time: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss');
export const normalize = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
