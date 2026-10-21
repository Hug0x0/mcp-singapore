# mcp-singapore

A TypeScript MCP server for Singapore public data: specialized tools, catalog discovery, official statistics, real-time feeds, and controlled dataset exports. Uses the `stdio` transport and requires Node.js 22.12 or later.

<!-- coverage-summary:start -->
**64 tools · 22 specialized datasets · 4664 datasets · 74 agencies.** Snapshot: 2026-10-21.
<!-- coverage-summary:end -->

The bundled index contains dataset metadata, not a copy of every observation. Records are retrieved on demand. Coverage dates, update frequency, formats, and definitions vary by provider. See [COVERAGE.md](COVERAGE.md) for the generated inventory.

## Data coverage

| Domain | Available data |
|---|---|
| Housing | HDB resale transactions since 2017, rentals, median rents, private property indices, HDB population |
| Business | UEN/ACRA entity registry and detailed alphabetical ACRA partitions |
| Education | School directory, preschool locations, catalog and SingStat education statistics |
| Food | Hawker centres and closure dates |
| Health | Infectious disease bulletins and healthcare schemes |
| Culture and sports | Museum attendance and sports facilities |
| Tourism | Visitor arrivals and hotel statistics |
| Environment | Recycling, greenhouse gas emissions, annual air quality |
| Weather | Temperature, rain, humidity, wind, 2-hour/24-hour/four-day forecasts, PSI, PM2.5, UV |
| Transport | Available taxis, parking spaces, traffic cameras; authenticated LTA bus and traffic feeds |
| Geography | OneMap geocoding, geographic exports, nearby facilities, SVY21/WGS84 conversion |
| Economy and society | Unemployment, government spending, SingStat tables |
| International comparisons | World Bank indicators for Singapore and up to five comparison countries |

The full catalog also covers census data, incomes, trade, energy, CPF, infrastructure, urban planning, and other topics. Historical observations are not presented as current measurements.

## Install from source

```sh
git clone https://github.com/Hug0x0/mcp-singapore.git
cd mcp-singapore
npm ci
npm run build
npm test
```

Configure a compatible MCP client with an absolute path to the cloned project:

```json
{
  "mcpServers": {
    "singapore": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-singapore/dist/index.js"]
    }
  }
}
```

The package name is `@hug0x0/mcp-singapore`. Publication to npm has not been performed; use the source installation until a published version is explicitly verified.

## Credentials

Public data.gov.sg, SingStat, and World Bank endpoints support public exploration subject to provider quotas. A data.gov.sg API key is recommended for production use. LTA and OneMap require their own credentials.

| Environment variable | Purpose |
|---|---|
| `DATA_GOV_SG_API_KEY` | Optional data.gov.sg key, sent in `x-api-key` |
| `LTA_ACCOUNT_KEY` | Required for LTA DataMall bus arrivals and other LTA tools |
| `ONEMAP_TOKEN` | Required for OneMap address search and reverse geocoding |

Set variables in the MCP client's `env` configuration or in the server process environment. `.env.example` is a template; the server does not automatically load `.env` files. Credentials are sent in request headers, never in tool arguments or request URLs.

```json
{
  "mcpServers": {
    "singapore": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-singapore/dist/index.js"],
      "env": {
        "DATA_GOV_SG_API_KEY": "your-data-gov-sg-key",
        "LTA_ACCOUNT_KEY": "your-lta-key",
        "ONEMAP_TOKEN": "your-onemap-token"
      }
    }
  }
}
```

Request credentials from [data.gov.sg](https://guide.data.gov.sg/developer-guide/api-overview/how-to-request-an-api-key), [LTA DataMall](https://datamall.lta.gov.sg/), and [OneMap](https://www.onemap.gov.sg/apidocs/). Configure only the services you use. Renew expired OneMap tokens with the provider.

## Research workflow

1. Use `singapore_find_relevant_tools` to route an English question to relevant tools.
2. Use `singapore_search_catalog` to search the bundled index by English keywords, agency, format, status, and coverage.
3. Use `singapore_inspect_dataset` to inspect current metadata and normalized field names. Field metadata is paginated; `include_raw` includes the original column mapping.
4. Use `singapore_query_dataset` or a specialized tool to retrieve records with filters, field searches, sorting, projection, and pagination.
5. Use `singapore_download_dataset` to initiate and poll an export when Datastore does not support the dataset.

Example catalog query:

```json
{"query":"resale flat prices","limit":5}
```

Then query `singapore_query_hdb_resale`:

```json
{"filters":{"town":"ANG MO KIO","flat_type":"4 ROOM"},"sort":"month desc","limit":10,"offset":0}
```

Filters use exact equality and preserve the provider's representation. Column search uses an object such as `{"school_name":"RAFFLES"}`. Inspect field names first. Numeric values may be strings; missing-value markers are preserved.

For SingStat, search `{"query":"population"}`, inspect resource `M810001`, then call `singapore_get_statistics` with `{"resource_id":"M810001","series_contains":"Total Population","period_limit":5}`. Series and period filtering occur locally after table retrieval; `period` can restrict the upstream request to an exact period.

## Analysis and nearby searches

`singapore_compare_hdb_prices` scans the complete official CSV export before calculating medians, quartiles, and prices per square metre. It reports exclusions and coverage rather than extrapolating from a single page.

`singapore_find_nearby_facilities` supports HDB carparks with live availability, hawker centres, preschools, park facilities, and sports facilities. Unsupported geometries and missing coordinates are counted. Preschool coverage does not include primary or secondary schools.

`singapore_convert_coordinates` converts SVY21 easting/northing to WGS84 longitude/latitude and back within supported Singapore bounds.

## MCP resources and results

Resources: `singapore://sources`, `singapore://coverage`, `singapore://usage`, `singapore://topics`.

Prompt: `research-singapore`, with a `question` argument.

Results contain `ok`, `served_at`, `data`, and `sources`, in both `structuredContent` and JSON text. `served_at` is the response emission time; HTTP provenance includes actual `fetched_at`, cache use, and cache age. Provider observation and update timestamps remain authoritative for the data itself.

The server bounds page sizes, request queues, output size, HTTP responses, and caches. It preserves continuation parameters and rejects oversized outputs explicitly. Requests use fixed provider origins and reject redirects. Credentials and request bodies are not sent to telemetry services.

## Maintenance and verification

```sh
npm run build
npm test
npm run docs:generate
npm run docs:check
npm run check:schema
npm run test:smoke
npm run test:smoke -- --all
npm run test:smoke -- --mode=auth
npm run test:package
npm audit
npm run refresh:catalog
```

Live verification is separate from ordinary pull-request tests. Authenticated checks are explicitly skipped when credentials are absent. The latest report is in [docs/live-verification.json](docs/live-verification.json). Successful checks do not guarantee future provider availability.

Catalog refresh validates complete pagination, dataset integrity, and required fields before replacing the index. Manual workflows provide catalog refresh proposals and provider verification artifacts. The source catalog and provider responses can change independently of this server.

## Documentation

- [Configuration and output contracts](docs/configuration.md)
- [Provider contracts and query behavior](docs/provider-contracts.md)
- [Analysis and geography](docs/analysis-and-geography.md)
- [Maintenance](docs/maintenance.md)
- [Release process](docs/release.md)
- [Implementation record](docs/issue-implementation.md)
- [Follow-up improvement backlog](docs/follow-up-backlog.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Sources

- [data.gov.sg developer documentation](https://guide.data.gov.sg/developer-guide)
- [SingStat developer API](https://tablebuilder.singstat.gov.sg/view-api/for-developers/test)
- [LTA API guide](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf)
- [OneMap documentation](https://www.onemap.gov.sg/apidocs/)
- [World Bank API documentation](https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information)

## License

MIT for the server code. Data remains subject to its providers' terms and attribution requirements. See the [Singapore Open Data Licence](https://data.gov.sg/open-data-license) and individual dataset metadata.
