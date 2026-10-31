# Graduate Employment Survey - NTU, NUS, SIT, SMU, SUSS & SUTD

[Browse dataset guides](README.md) · [Server setup](../../README.md#install-from-source)

Official dataset: [data.gov.sg](https://data.gov.sg/datasets/d_3c55210de27fcccda2ed0c63fdd2b352/view).

| Catalog field | Snapshot value |
|---|---|
| Dataset ID | `d_3c55210de27fcccda2ed0c63fdd2b352` |
| Publishing agency | Ministry of Education |
| Format | CSV |
| Status | active |
| Provider update timestamp | 2026-03-05T18:07:12+08:00 |
| Coverage start | 2013-11-01T00:00:00+08:00 |
| Coverage end | 2025-03-31T23:59:59+08:00 |
| Catalog retrieved at | 2026-10-21T15:17:51.033Z |

These values describe the bundled catalog snapshot. Inspect live metadata before relying on coverage, availability, field names, or freshness. A recent update timestamp can refer to a revision of historical data.

## Publisher description

The Graduate Employment Survey (GES) is jointly conducted by NTU, NUS, SMU, SIT (from 2014), SUTD (from 2015) and SUSS (from 2018) annually to survey the employment conditions of graduates about six months after their final examinations. The Ministry of Education (MOE) publishes the results of key employment indicators of the survey to provide prospective students with timely and comparable data to assist them in making informed course decisions. Graduates from NTU, NUS, SMU and SUSS are surveyed in November of the graduation year. Due to a difference in academic calendar, graduates from SIT are surveyed in March of the following year after graduation. Graduates from SUTD were surveyed in February of the year after graduation until 2024, when they were surveyed in November of the graduation year, after aligning its academic calendar with the majority of the AUs. 2024 GES: \* 6,056 fresh graduates and 161 follow-up graduates from NTU were surveyed and the overall response rates obtained were 74.2% and 61.5% respectively. \* 7,382 fresh graduates and 806 follow-up graduates from NUS were surveyed and the overall response rates obtained were 71.4% and 53.0% respectively. \* 2,300 fresh g…

Description excerpt from the bundled provider metadata; consult the official dataset for complete definitions, footnotes, and terms.

## Inspect before querying

MCP tool call (tool name and arguments):

```json
{
  "name": "singapore_inspect_dataset",
  "arguments": {
    "dataset_id": "d_3c55210de27fcccda2ed0c63fdd2b352",
    "fields_limit": 50,
    "fields_offset": 0
  }
}
```

Read the returned field identifiers, units, missing-value conventions, and coverage. If more fields are available, follow the returned pagination. Use the returned column names when constructing filters or projections.

## Request a small sample

For datasets supported by the provider datastore, start with a bounded page:

```json
{
  "name": "singapore_query_dataset",
  "arguments": {
    "dataset_id": "d_3c55210de27fcccda2ed0c63fdd2b352",
    "limit": 5,
    "offset": 0
  }
}
```

Inspect the response pagination before requesting another page. A sample is not a full dataset summary. CSV format alone does not guarantee datastore availability; use an export if the provider rejects record queries.

## Export workflow

Use an export when the datastore is unavailable or a complete offline analysis is needed.

```json
{
  "name": "singapore_download_dataset",
  "arguments": {
    "dataset_id": "d_3c55210de27fcccda2ed0c63fdd2b352",
    "action": "initiate"
  }
}
```

If the result is pending, poll on a later call:

```json
{
  "name": "singapore_download_dataset",
  "arguments": {
    "dataset_id": "d_3c55210de27fcccda2ed0c63fdd2b352",
    "action": "poll"
  }
}
```

Wait for a ready result before using its download URL. URLs may expire. The tool returns export status and a URL; it does not load the entire exported file into the conversation. Provider availability and quota limits still apply.

## Suggested request

> Inspect dataset d_3c55210de27fcccda2ed0c63fdd2b352 (Graduate Employment Survey - NTU, NUS, SIT, SMU, SUSS & SUTD). Explain its coverage, publisher definitions, and available fields. Retrieve five sample records if datastore access is supported. Cite the source and distinguish historical observations from current conditions.

## Interpretation

- Preserve provider units and missing values; do not interpret missing observations as zero.
- Check definitions and population coverage before comparing this dataset with another series.
- Attribute the publishing agency and retain source URLs and observation dates in any analysis.
- This guide contains metadata and request examples. Live record access and export completion have not been verified by generating this page.
