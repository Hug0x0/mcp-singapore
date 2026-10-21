#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { abortAllRequests } from './http.js';
const server=createServer();
let closing=false;
async function close(){if(closing)return;closing=true;abortAllRequests();await server.close();}
process.once('SIGINT',()=>{void close();});
process.once('SIGTERM',()=>{void close();});
server.connect(new StdioServerTransport()).catch(()=>{console.error('Unable to start MCP Singapore');process.exitCode=1;});
