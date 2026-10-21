import{Readable}from'node:stream';import{parse}from'csv-parse';import type{Row}from'./types.js';
export async function* csvRows(buffer:Buffer):AsyncGenerator<Row>{const parser=Readable.from([buffer]).pipe(parse({columns:true,bom:true,skip_empty_lines:true,max_record_size:1024*1024}));for await(const row of parser)yield row as Row;}
