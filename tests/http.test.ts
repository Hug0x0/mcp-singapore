import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpClient, ApiError, url } from '../src/http.js';
const origin = 'https://data.gov.sg/api/action/datastore_search';
test('encodes filters and text without changing parameter boundaries', () => {
  const result = url(origin, { filters: { town: "A&B'" }, q: { name: 'x=1&limit=9000' }, limit: 1, absent: undefined });
  assert.equal(result.searchParams.get('filters'), JSON.stringify({ town: "A&B'" }));
  assert.equal(result.searchParams.get('limit'), '1');
  assert.equal(result.searchParams.has('absent'), false);
});
test('blocks external origins, ports, embedded credentials and HTTP', async () => {
  const client = new HttpClient(async () => { throw Error('must not fetch'); });
  for (const target of ['https://example.com', 'http://data.gov.sg', 'https://secret@data.gov.sg', 'https://data.gov.sg:444']) await assert.rejects(client.get(target), /Unsupported API origin/);
});
test('deduplicates concurrent requests and uses a bounded session cache', async () => {
  let calls = 0;
  const client = new HttpClient(async () => { calls++; await new Promise(r => setTimeout(r, 5)); return Response.json({ value: 42 }); });
  const [first, second] = await Promise.all([client.get(origin, { ttlMs: 10000 }), client.get(origin, { ttlMs: 10000 })]);
  assert.deepEqual(first, second); await client.get(origin, { ttlMs: 10000 }); assert.equal(calls, 1);
});
test('does not cache application-level errors', async () => {
  let calls = 0;
  const client = new HttpClient(async () => { calls++; return Response.json({ success: false, error: { message: 'bad field' } }); });
  await assert.rejects(client.get(origin, { ttlMs: 1000 }), ApiError);
  await assert.rejects(client.get(origin, { ttlMs: 1000 }), ApiError);
  assert.equal(calls, 2);
});
test('passes credentials only in headers and forbids redirects', async () => {
  const client = new HttpClient(async (input, options) => {
    assert.equal(String(input), origin); assert.equal(options?.redirect, 'error');
    assert.equal((options?.headers as Record<string,string>).AccountKey, 'private-key');
    return new Response('upstream debug private-key', { status: 401 });
  });
  await assert.rejects(client.get(origin, { headers: { AccountKey: 'private-key' } }), (e: unknown) => e instanceof ApiError && e.status === 401 && !e.message.includes('private-key'));
});
test('respects a long Retry-After without blocking the caller for minutes', async () => {
  const client = new HttpClient(async () => new Response(null, { status: 429, headers: { 'Retry-After': '120' } }));
  await assert.rejects(client.get(origin), (e: unknown) => e instanceof ApiError && e.retryAfterSeconds === 120);
});
test('retries a transient 503 and succeeds', async () => {
  let calls = 0;
  const client = new HttpClient(async () => ++calls === 1 ? new Response(null, { status: 503 }) : Response.json({ ok: true }));
  assert.deepEqual(await client.get(origin), { ok: true }); assert.equal(calls, 2);
});
test('rejects invalid JSON and oversized responses', async () => {
  await assert.rejects(new HttpClient(async () => new Response('<html>')).get(origin), /Invalid JSON/);
  await assert.rejects(new HttpClient(async () => new Response(' '.repeat(8 * 1024 * 1024 + 1))).get(origin), /8 MiB/);
});
