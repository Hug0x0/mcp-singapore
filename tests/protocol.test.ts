import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
test('MCP discovery, resources, prompts, offline calls and invalid arguments', async () => {
  const server = createServer(); const client = new Client({ name:'tests', version:'1.0.0' });
  const [a,b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length,55); assert.equal(new Set(tools.map(t=>t.name)).size,55);
    assert.ok(tools.every(t=>t.annotations?.readOnlyHint === true));
    const result = await client.callTool({ name:'singapore_search_catalog', arguments:{ query:'resale', limit:2 } });
    assert.notEqual(result.isError,true); const content = result.content as { type:string; text:string }[];
    assert.ok(JSON.parse(content[0].text).data.datasets.length <= 2);
    const invalid = await client.callTool({ name:'singapore_query_dataset', arguments:{ dataset_id:'../../secret' } });
    assert.equal(invalid.isError,true);
    assert.equal((await client.listResources()).resources.length,4);
    const coverage = await client.readResource({ uri:'singapore://coverage' }); assert.ok(coverage.contents.length);
    const prompts = await client.listPrompts(); assert.equal(prompts.prompts.length,1);
    const prompt = await client.getPrompt({ name:'research-singapore', arguments:{question:'GDP'} }); assert.ok(prompt.messages.length);
    const savedToken = process.env.ONEMAP_TOKEN; delete process.env.ONEMAP_TOKEN;
    try {
      const noToken = await client.callTool({ name:'singapore_search_address', arguments:{query:'Marina Bay'} });
      assert.equal(noToken.isError,true); assert.match(JSON.stringify(noToken),/ONEMAP_TOKEN/);
    } finally { if(savedToken !== undefined) process.env.ONEMAP_TOKEN = savedToken; }
    const saved = process.env.LTA_ACCOUNT_KEY; delete process.env.LTA_ACCOUNT_KEY;
    try {
      const noKey = await client.callTool({name:'singapore_get_bus_arrivals',arguments:{bus_stop_code:'01012'}});
      assert.equal(noKey.isError,true); assert.match(JSON.stringify(noKey),/LTA_ACCOUNT_KEY/);
    } finally { if(saved !== undefined) process.env.LTA_ACCOUNT_KEY = saved; }
  } finally { await client.close(); await server.close(); }
});
