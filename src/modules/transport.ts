import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, dateSchema, limitSchema, offsetSchema, pagination } from '../tools.js';
import { http, url, dataGovHeaders, ApiError } from '../http.js';
import {ltaEndpoints,ltaPage,ltaHeaders,validateLta}from'../clients/lta.js';
import{parseNumber}from'../data-utils.js';
import type { Row } from '../types.js';
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (n: number) => n * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
const nearbyShape = { latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), radius_km: z.number().positive().max(100).default(5), limit: limitSchema, offset: offsetSchema };
function validateCoordinates(lat?: number, lon?: number) { if ((lat === undefined) !== (lon === undefined)) throw new ApiError('Provide both latitude and longitude'); }
export function normalizeCarpark(raw:Row){const info=Array.isArray(raw.carpark_info)?raw.carpark_info as Row[]:[];return{...raw,lots:info.map(l=>{const available=parseNumber(l.lots_available),total=parseNumber(l.total_lots);return{lot_type:l.lot_type,available,total,occupied:available!==null&&total!==null&&available<=total?total-available:null,available_percent:available!==null&&total!==null&&total>0&&available<=total?100*available/total:null};})};}
export function registerTransport(server: McpServer) {
  addTool(server, 'singapore_get_taxi_availability', 'Available taxi coordinates from data.gov.sg, optionally within a radius sorted by distance. Latest unless date_time supplied. Coordinates use WGS84; returns a bounded sample and total match count.', { ...nearbyShape, date_time: dateSchema }, async ({ latitude, longitude, radius_km, limit, offset, date_time }) => {
    validateCoordinates(latitude, longitude);
    const target = url('https://api.data.gov.sg/v1/transport/taxi-availability', { date_time });
    const body = await http.get<{ features: { geometry: { coordinates: number[][] }; properties: Row }[] }>(target, { headers: dataGovHeaders(), ttlMs: 30000,rateGroup:'transport' });
    const coordinates = body.features.flatMap(f => f.geometry.coordinates);
    let taxis = coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon, distance_km: latitude !== undefined && longitude !== undefined ? distanceKm(latitude, longitude, lat, lon) : undefined }));
    if (latitude !== undefined) taxis = taxis.filter(t => t.distance_km! <= radius_km).sort((a,b) => a.distance_km! - b.distance_km!);
    return { source_url: target.href, data: { upstream_metadata: body.features.map(f => f.properties), total_available: coordinates.length, matching: taxis.length, taxis: taxis.slice(offset, offset+limit),...pagination(taxis.length,offset,Math.min(limit,Math.max(0,taxis.length-offset))) } };
  });
  addTool(server, 'singapore_get_carpark_availability', 'HDB/URA carpark live available lots by carpark number. Does not include coordinates: join with carpark directory to locate carparks.', { carpark_number: z.string().max(20).optional(), date_time: dateSchema, limit: limitSchema, offset: offsetSchema }, async ({ carpark_number, date_time, limit, offset }) => {
    const target = url('https://api.data.gov.sg/v1/transport/carpark-availability', { date_time });
    const body = await http.get<{ items: { timestamp: string; carpark_data: Row[] }[] }>(target, { headers: dataGovHeaders(), ttlMs: 30000,rateGroup:'transport' });
    const rows = body.items.flatMap(item => item.carpark_data.filter(c => !carpark_number || c.carpark_number === carpark_number.toUpperCase()).map(c => ({ ...normalizeCarpark(c), snapshot_timestamp: item.timestamp })));
    return { source_url: target.href, data: { matching: rows.length, carparks: rows.slice(offset, offset + limit), ...pagination(rows.length,offset,Math.min(limit,Math.max(0,rows.length-offset))) } };
  });
  addTool(server, 'singapore_get_traffic_images', 'Traffic camera image URLs, coordinates and timestamps. Optional radius filter. Image URLs are returned, never fetched by this server.', { ...nearbyShape,camera_id:z.string().max(30).optional(), date_time: dateSchema }, async ({ latitude, longitude, radius_km, limit, offset, date_time,camera_id }) => {
    validateCoordinates(latitude, longitude);
    const target = url('https://api.data.gov.sg/v1/transport/traffic-images', { date_time });
    const body = await http.get<{ items: { timestamp: string; cameras: (Row & { location: { latitude: number; longitude: number } })[] }[] }>(target, { headers: dataGovHeaders(), ttlMs: 60000,rateGroup:'transport' });
    let cameras = body.items.flatMap(item => item.cameras.map(c => ({ ...c, snapshot_timestamp: item.timestamp, distance_km: latitude !== undefined && longitude !== undefined ? distanceKm(latitude, longitude, c.location.latitude, c.location.longitude) : undefined })));
    if(camera_id)cameras=cameras.filter(c=>(c as Row).camera_id===camera_id);
    if (latitude !== undefined) cameras = cameras.filter(c => c.distance_km! <= radius_km).sort((a,b) => a.distance_km! - b.distance_km!);
    return { source_url: target.href, data: { matching: cameras.length, cameras: cameras.slice(offset, offset+limit),...pagination(cameras.length,offset,Math.min(limit,Math.max(0,cameras.length-offset))) } };
  });
  addTool(server, 'singapore_get_bus_arrivals', 'Live next buses at a bus stop, estimated arrival, load and accessibility. Requires LTA_ACCOUNT_KEY. Bus stop codes retain leading zeros.', { bus_stop_code: z.string().regex(/^\d{5}$/), service_no: z.string().regex(/^[A-Za-z0-9]{1,10}$/).optional() }, async ({ bus_stop_code, service_no }) => {
    const headers=ltaHeaders();
    const target = url('https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival', { BusStopCode: bus_stop_code, ServiceNo: service_no });
    const data=await http.get<Row>(target,{headers,ttlMs:20000});validateLta(data,'arrival');return{source_url:target.href,data};
  });
  addTool(server,'singapore_query_lta','LTA lists and alerts. Requires LTA_ACCOUNT_KEY. Stop/service filters are allowed only on provider endpoints supporting them. Offsets apply only to paginated datasets.',{dataset:z.enum(Object.keys(ltaEndpoints)as[keyof typeof ltaEndpoints,...(keyof typeof ltaEndpoints)[]]),offset:offsetSchema,limit:limitSchema,bus_stop_code:z.string().regex(/^\d{5}$/).optional(),service_no:z.string().regex(/^[A-Za-z0-9]{1,10}$/).optional()},async({dataset,offset,limit,bus_stop_code,service_no})=>{const page=await ltaPage(dataset,offset,bus_stop_code,service_no);if(!ltaEndpoints[dataset].paginated)return{...page,data:{results:page.data,returned:Array.isArray(page.data)?page.data.length:1,has_more:false,next_offset:null}};const rows=page.data as Row[];return{source_url:page.source_url,data:{results:rows.slice(0,limit),returned:Math.min(rows.length,limit),upstream_page_count:rows.length,offset,has_more:rows.length>0,next_offset:rows.length?offset+Math.min(rows.length,limit):null},warnings:['Continue until an empty upstream page; each query is not a national inventory.']};});
  addTool(server,'singapore_find_nearby_bus_stops','Search a bounded set of LTA bus-stop pages near WGS84 coordinates. Requires LTA_ACCOUNT_KEY. Complete is true only after an upstream short page; continuation identifies the next unscanned page.',{latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),radius_km:z.number().positive().max(100).default(2),max_pages:z.number().int().min(1).max(10).default(3),offset:offsetSchema,limit:limitSchema},async({latitude,longitude,radius_km,max_pages,offset,limit})=>{let next=offset,pages=0,complete=false;const matches:Row[]=[];for(;pages<max_pages;){const page=await ltaPage('bus_stops',next);const rows=page.data as Row[];pages++;for(const stop of rows){const lat=parseNumber(stop.Latitude),lon=parseNumber(stop.Longitude);if(lat===null||lon===null)continue;const distance=distanceKm(latitude,longitude,lat,lon);if(distance<=radius_km)matches.push({...stop,distance_km:distance});}next+=rows.length;if(rows.length<500){complete=true;break;}}matches.sort((a,b)=>Number(a.distance_km)-Number(b.distance_km));return{data:{stops:matches.slice(0,limit),returned:Math.min(limit,matches.length),matching_in_scanned_pages:matches.length,omitted_matches:Math.max(0,matches.length-limit),pages_read:pages,complete,next_upstream_offset:complete?null:next},warnings:complete?[]:['Partial upstream scan; distances are sorted only within the scanned pages.']};});
}
