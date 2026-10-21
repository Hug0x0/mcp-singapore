import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, limitSchema } from '../tools.js';
import { http, url } from '../http.js';
import type { Row } from '../types.js';
export const indicators = {
  population: { id: 'SP.POP.TOTL', title: 'Total population' },
  gdp: { id: 'NY.GDP.MKTP.CD', title: 'GDP, current US$' },
  gdp_per_capita: { id: 'NY.GDP.PCAP.CD', title: 'GDP per capita, current US$' },
  gdp_growth: { id: 'NY.GDP.MKTP.KD.ZG', title: 'GDP growth, annual %' },
  inflation: { id: 'FP.CPI.TOTL.ZG', title: 'Consumer price inflation, annual %' },
  unemployment: { id: 'SL.UEM.TOTL.ZS', title: 'Unemployment, % of labour force, modeled ILO estimate' },
  life_expectancy: { id: 'SP.DYN.LE00.IN', title: 'Life expectancy at birth, years' },
  fertility: { id: 'SP.DYN.TFRT.IN', title: 'Fertility rate, births per woman' },
  trade_gdp: { id: 'NE.TRD.GNFS.ZS', title: 'Trade, % GDP' },
  foreign_investment: { id: 'BX.KLT.DINV.WD.GD.ZS', title: 'FDI net inflows, % GDP' },
  internet: { id: 'IT.NET.USER.ZS', title: 'Individuals using Internet, % population' },
  urban_population: { id: 'SP.URB.TOTL.IN.ZS', title: 'Urban population, % total' },
  health_spending: { id: 'SH.XPD.CHEX.GD.ZS', title: 'Current health expenditure, % GDP' },
  education_spending: { id: 'SE.XPD.TOTL.GD.ZS', title: 'Government education expenditure, % GDP' },
} as const;
export function registerWorldBank(server: McpServer) {
  addTool(server, 'singapore_list_indicators', 'Curated World Bank indicators for Singapore. Other valid indicator codes work with get_indicator.', {}, () => ({ source_url: 'https://data.worldbank.org/country/singapore', data: indicators }));
  addTool(server, 'singapore_get_indicator', 'World Bank historical indicator for Singapore, optionally comparing up to five ISO3 countries. Latest years first; null values are preserved. Definitions and publication lag can differ from SingStat. No key required.', { indicator: z.string().regex(/^[A-Za-z0-9_.]{1,100}$/).describe('Curated alias (e.g. gdp) or World Bank code'), compare_countries: z.array(z.string().regex(/^[A-Z]{3}$/)).max(5).default([]), from_year: z.number().int().min(1960).max(2100).default(2010), to_year: z.number().int().min(1960).max(2100).default(new Date().getUTCFullYear()), page: z.number().int().min(1).max(10000).default(1), limit: limitSchema }, async ({ indicator, compare_countries, from_year, to_year, page, limit }) => {
    if (from_year > to_year) throw new Error('Invalid year range');
    const code = indicators[indicator as keyof typeof indicators]?.id ?? indicator;
    const countries = [...new Set(['SGP', ...compare_countries])];
    const target = url(`https://api.worldbank.org/v2/country/${countries.join(';')}/indicator/${code}`, { format: 'json', date: `${from_year}:${to_year}`, per_page: limit, page });
    const body = await http.get<[Row, Row[] | null]>(target, { ttlMs: 3600000 });
    if (!Array.isArray(body) || body.length < 2 || body[0].message) throw new Error('Invalid indicator response');
    return { source_url: target.href, data: { pagination: body[0], observations: body[1] ?? [] } };
  });
}
