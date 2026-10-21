import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, dateSchema } from '../tools.js';
import { http, url, dataGovHeaders } from '../http.js';
export const weatherFeeds = [
  ['air_temperature', 'air-temperature', 'NEA air temperature observations by station (degrees Celsius)'],
  ['rainfall', 'rainfall', 'NEA rainfall observations by station (mm)'],
  ['relative_humidity', 'relative-humidity', 'NEA relative humidity by station (%)'],
  ['wind_speed', 'wind-speed', 'NEA wind speed by station (knots, preserve upstream units)'],
  ['wind_direction', 'wind-direction', 'NEA wind direction by station (degrees)'],
  ['forecast_2h', 'two-hr-forecast', 'NEA 2-hour forecast by area, with validity period'],
  ['forecast_24h', 'twenty-four-hr-forecast', 'NEA 24-hour forecast with temperature, humidity, wind and regional outlook'],
  ['forecast_4day', 'four-day-outlook', 'NEA four-day weather outlook'],
  ['psi', 'psi', 'NEA Pollutant Standards Index and pollutant concentrations by region'],
  ['pm25', 'pm25', 'NEA fine particulate matter PM2.5 by region (micrograms per cubic metre)'],
  ['uv_index', 'uv', 'NEA UV index readings'],
] as const;
export function registerRealtime(server: McpServer) {
  for (const [name, endpoint, description] of weatherFeeds) {
    addTool(server, `singapore_get_${name}`, `${description}. Latest if date omitted. Dates are Singapore local time. Returns upstream timestamps, metadata and pagination token; forward paginationToken to retrieve more history.`, { date: dateSchema, pagination_token: z.string().max(2000).optional() }, async ({ date, pagination_token }) => {
      const target = url(`https://api-open.data.gov.sg/v2/real-time/api/${endpoint}`, { date, paginationToken: pagination_token });
      return { source_url: target.href, data: (await http.get<{ data: unknown }>(target, { headers: dataGovHeaders(), ttlMs: 60000, intervalMs: 1800, rateGroup: 'realtime' })).data };
    });
  }
}
