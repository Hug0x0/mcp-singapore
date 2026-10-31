# Provider integrations and queries

Fixtures in `tests/fixtures/providers.json` are synthetic and contain no credentials. Contract tests cover LTA lists, object alerts, bus arrivals with empty next-vehicle objects, OneMap empty search results, authentication errors, and unexpected structures. These tests do not constitute verification using real credentials.

Use the authenticated verification mode with environment credentials to test actual provider access. Missing credentials are marked skipped. Generate and renew OneMap tokens manually at https://www.onemap.gov.sg/apidocs/. The server stores no password and performs no background token renewal.

Weather tools accept station, area, region, limit, and offset parameters where applicable. Regions are north/south/east/west/central/national. Limits apply to timestamp groups on the current upstream page. Consume local offsets before forwarding `pagination.upstream_pagination_token`. Filtered metadata retains station names and coordinates. Use `singapore_list_weather_stations` to discover station IDs.

Taxi and traffic-camera results support local pagination after radius filtering. Cameras also accept `camera_id`. These are moving snapshots: pages retrieved at different times may differ. Parking results preserve raw values and add normalized `lots`, occupied spaces, and availability percentages. Unknown or inconsistent values remain null.

Paginated LTA lists return continuation offsets until an empty page. Unpaginated alerts do not. `bus_stop_code` is supported for bus_stops and `service_no` for bus_services; unsupported combinations fail locally. Nearby bus-stop scans report their page budget, completeness, local-result continuation, and next upstream offset.

Catalog filters include `status`, `coverage_year`, `updated_since`, and `include_unknown_coverage`. Missing dates remain unknown. English keyword expansion uses a bounded synonym dictionary rather than unrestricted translation. Exact dataset-ID lookup uses the local snapshot; collection listing queries the current provider catalog.

SingStat sorts recognized annual, quarterly, and monthly periods before selecting recent observations. Unknown labels preserve upstream ordering and produce a warning. `from_period`, `to_period`, and `order` apply locally after download. Missing-value markers remain strings.

Datastore field names are checked against cached provider metadata before querying. Detailed ACRA search requires an explicit A-Z or Others partition and never implicitly scans all 27 partitions.
