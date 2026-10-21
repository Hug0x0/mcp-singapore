import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, dateSchema, limitSchema, offsetSchema } from '../tools.js';
import { http, url, dataGovHeaders, ApiError } from '../http.js';
import type { Row } from '../types.js';
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (n: number) => n * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
const nearbyShape = { latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), radius_km: z.number().positive().max(100).default(5), limit: limitSchema };
function validateCoordinates(lat?: number, lon?: number) { if ((lat === undefined) !== (lon === undefined)) throw new ApiError('Provide both latitude and longitude'); }
export const ltaEndpoints = {
  bus_stops: 'BusStops', bus_routes: 'BusRoutes', bus_services: 'BusServices',
  carparks: 'CarParkAvailabilityv2', traffic_incidents: 'TrafficIncidents', traffic_speed_bands: 'v4/TrafficSpeedBands',
  taxi_stands: 'TaxiStands', train_service_alerts: 'TrainServiceAlerts', estimated_travel_times: 'EstTravelTimes', flood_alerts: 'PubFloodAlerts', faulty_traffic_lights: 'v2/FaultyTrafficLights', road_works: 'RoadWorks', road_openings: 'RoadOpenings',
} as const;
export function registerTransport(server: McpServer) {
  addTool(server, 'singapore_get_taxi_availability', 'Available taxi coordinates from data.gov.sg, optionally within a radius sorted by distance. Latest unless date_time supplied. Coordinates use WGS84; returns a bounded sample and total match count.', { ...nearbyShape, date_time: dateSchema }, async ({ latitude, longitude, radius_km, limit, date_time }) => {
    validateCoordinates(latitude, longitude);
    const target = url('https://api.data.gov.sg/v1/transport/taxi-availability', { date_time });
    const body = await http.get<{ features: { geometry: { coordinates: number[][] }; properties: Row }[] }>(target, { headers: dataGovHeaders(), ttlMs: 30000 });
    const coordinates = body.features.flatMap(f => f.geometry.coordinates);
    let taxis = coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon, distance_km: latitude !== undefined && longitude !== undefined ? distanceKm(latitude, longitude, lat, lon) : undefined }));
    if (latitude !== undefined) taxis = taxis.filter(t => t.distance_km! <= radius_km).sort((a,b) => a.distance_km! - b.distance_km!);
    return { source_url: target.href, data: { upstream_metadata: body.features.map(f => f.properties), total_available: coordinates.length, matching: taxis.length, taxis: taxis.slice(0, limit) } };
  });
  addTool(server, 'singapore_get_carpark_availability', 'HDB/URA carpark live available lots by carpark number. Does not include coordinates: join with carpark directory to locate carparks.', { carpark_number: z.string().max(20).optional(), date_time: dateSchema, limit: limitSchema, offset: offsetSchema }, async ({ carpark_number, date_time, limit, offset }) => {
    const target = url('https://api.data.gov.sg/v1/transport/carpark-availability', { date_time });
    const body = await http.get<{ items: { timestamp: string; carpark_data: Row[] }[] }>(target, { headers: dataGovHeaders(), ttlMs: 30000 });
    const rows = body.items.flatMap(item => item.carpark_data.filter(c => !carpark_number || c.carpark_number === carpark_number.toUpperCase()).map(c => ({ ...c, snapshot_timestamp: item.timestamp })));
    return { source_url: target.href, data: { matching: rows.length, carparks: rows.slice(offset, offset + limit), next_offset: offset + limit < rows.length ? offset + limit : null } };
  });
  addTool(server, 'singapore_get_traffic_images', 'Traffic camera image URLs, coordinates and timestamps. Optional radius filter. Image URLs are returned, never fetched by this server.', { ...nearbyShape, date_time: dateSchema }, async ({ latitude, longitude, radius_km, limit, date_time }) => {
    validateCoordinates(latitude, longitude);
    const target = url('https://api.data.gov.sg/v1/transport/traffic-images', { date_time });
    const body = await http.get<{ items: { timestamp: string; cameras: (Row & { location: { latitude: number; longitude: number } })[] }[] }>(target, { headers: dataGovHeaders(), ttlMs: 60000 });
    let cameras = body.items.flatMap(item => item.cameras.map(c => ({ ...c, snapshot_timestamp: item.timestamp, distance_km: latitude !== undefined && longitude !== undefined ? distanceKm(latitude, longitude, c.location.latitude, c.location.longitude) : undefined })));
    if (latitude !== undefined) cameras = cameras.filter(c => c.distance_km! <= radius_km).sort((a,b) => a.distance_km! - b.distance_km!);
    return { source_url: target.href, data: { matching: cameras.length, cameras: cameras.slice(0, limit) } };
  });
  addTool(server, 'singapore_get_bus_arrivals', 'Live next buses at a bus stop, estimated arrival, load and accessibility. Requires LTA_ACCOUNT_KEY. Bus stop codes retain leading zeros.', { bus_stop_code: z.string().regex(/^\d{5}$/), service_no: z.string().regex(/^[A-Za-z0-9]{1,10}$/).optional() }, async ({ bus_stop_code, service_no }) => {
    const key = process.env.LTA_ACCOUNT_KEY;
    if (!key) throw new ApiError('Set LTA_ACCOUNT_KEY to use LTA DataMall. Register at https://datamall.lta.gov.sg/');
    const target = url('https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival', { BusStopCode: bus_stop_code, ServiceNo: service_no });
    return { source_url: target.href, data: await http.get<Row>(target, { headers: { AccountKey: key }, ttlMs: 20000 }) };
  });
  addTool(server, 'singapore_query_lta', 'Read LTA DataMall bus stops/routes/services, carparks, incidents, speed bands, taxi stands, train alerts or estimated travel times. Requires LTA_ACCOUNT_KEY. Pagination is upstream $skip (usually 500/page); query is one page, not the complete national inventory.', { dataset: z.enum(Object.keys(ltaEndpoints) as [keyof typeof ltaEndpoints, ...(keyof typeof ltaEndpoints)[]]), offset: offsetSchema, limit: limitSchema }, async ({ dataset, offset, limit }) => {
    const key = process.env.LTA_ACCOUNT_KEY;
    if (!key) throw new ApiError('Set LTA_ACCOUNT_KEY to use LTA DataMall. Register at https://datamall.lta.gov.sg/');
    const target = url(`https://datamall2.mytransport.sg/ltaodataservice/${ltaEndpoints[dataset]}`, { '$skip': offset });
    const body = await http.get<{ value: unknown }>(target, { headers: { AccountKey: key }, ttlMs: 60000 });
    const rows = Array.isArray(body.value) ? body.value : null;
    return { source_url: target.href, data: { results: rows ? rows.slice(0, limit) : body.value, returned: rows ? Math.min(rows.length, limit) : undefined, upstream_page_count: rows?.length, offset, next_offset: rows?.length ? offset + Math.min(rows.length, limit) : null }, warnings: ['Only this upstream page is queried. Continue until an empty page; alert endpoints may be unpaginated.'] };
  });
}
