# HDB analysis and nearby facilities

`singapore_compare_hdb_prices` accepts one to five `towns`, `from_month`, `to_month`, and optional `flat_type`. It downloads the complete official CSV export and streams all records through the parser. Groups remain separate by town and flat type. Medians and quartiles use linear interpolation. Price per square metre includes only transactions with a known positive area. Results include exclusions and scanned-row counts; interrupted collection does not produce a claimed complete estimate.

Example: `{"towns":["ANG MO KIO","BEDOK"],"flat_type":"4 ROOM","from_month":"2026-09","to_month":"2026-10"}`.

Amounts use SGD without inflation or quality adjustment. Descriptive differences are not causal neighborhood effects or property valuations. Empty values, missing markers, dashes, and invalid numbers are never converted to zero.

`singapore_find_nearby_facilities` accepts `category` (carparks, hawker_centres, preschools, parks, or sport_facilities), latitude, longitude, radius_km, limit, and offset. HDB carparks are joined to public availability; unmatched identifiers return availability:null. Other categories use GeoJSON points. Unsupported geometries, missing coordinates, and unknown reference systems are counted rather than transformed arbitrarily. Preschool data does not cover primary or secondary schools.

`singapore_convert_coordinates` accepts `from` (SVY21 or WGS84), `x`, and `y`. SVY21 uses easting/northing in metres; WGS84 uses longitude/latitude in degrees. [Official SLA projection parameters](https://app.sla.gov.sg/sirent/About/PlaneCoordinateSystem) are implemented using [Proj4js](https://proj4js.org/). CSV processing uses [csv-parse](https://csv.js.org/parse/api/async_iterator/).

Exports are initiated and polled through the official API. Normalized states are initiated, pending, ready, and failed. GeoJSON exports can return a ready URL without a status field; that variant is supported. Neither a status nor a URL means pending. Ordinary export tools return state; analysis tools wait for at most three polls before returning EXPORT_PENDING.

Internal downloads accept only provider-issued URLs bound to the requested dataset. Origins and paths are validated; redirects and embedded URL credentials are rejected. Limits: 64 MiB per download, 64 MiB and five minutes for the export cache, two distinct simultaneous downloads, and a 60-second download deadline. MCP cancellation is propagated. Downloaded files and signed URLs are not persisted to disk. For larger exports, use the provider's URL outside the conversation.
