import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool } from '../tools.js';
import { http, url, ApiError } from '../http.js';
import type { Row } from '../types.js';
function headers() { const token = process.env.ONEMAP_TOKEN; if (!token) throw new ApiError('Set ONEMAP_TOKEN for OneMap. Generate a token at https://www.onemap.gov.sg/apidocs/'); return { Authorization: token }; }
export function registerGeography(server: McpServer) {
  addTool(server, 'singapore_search_address', 'OneMap official address/building/postal-code geocoding (WGS84 plus SVY21). Requires ONEMAP_TOKEN. Search pages are provider pages, usually 10 results.', { query: z.string().min(1).max(200), page: z.number().int().min(1).max(10000).default(1) }, async ({ query, page }) => {
    const target = url('https://www.onemap.gov.sg/api/common/elastic/search', { searchVal: query, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: page });
    const body = await http.get<Row>(target, { headers: headers(), ttlMs: 3600000 });
    if (body.error) throw new ApiError('OneMap rejected the request; check ONEMAP_TOKEN and its expiry');
    return { source_url: target.href, data: body };
  });
  addTool(server, 'singapore_reverse_geocode', 'OneMap reverse geocoding of Singapore WGS84 coordinates to nearby addresses. Requires ONEMAP_TOKEN.', { latitude: z.number().min(1.1).max(1.5), longitude: z.number().min(103.5).max(104.2), radius_m: z.number().int().min(1).max(500).default(100) }, async ({ latitude, longitude, radius_m }) => {
    const target = url('https://www.onemap.gov.sg/api/public/revgeocode', { location: `${latitude},${longitude}`, buffer: radius_m, addressType: 'All', otherFeatures: 'Y' });
    const body = await http.get<Row>(target, { headers: headers(), ttlMs: 3600000 });
    if (body.error) throw new ApiError('OneMap rejected the request; check ONEMAP_TOKEN and its expiry');
    return { source_url: target.href, data: body };
  });
}
