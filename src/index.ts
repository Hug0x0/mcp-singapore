#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
const server = createServer();
server.connect(new StdioServerTransport()).catch(() => { console.error('Unable to start MCP Singapore'); process.exitCode = 1; });
