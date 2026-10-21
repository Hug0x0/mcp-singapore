# Resale flat prices based on registration date from Jan-2017 onwards

[Browse dataset guides](README.md) · [Server setup](../../README.md#install-from-source)

Official dataset: [data.gov.sg](https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view).

| Catalog field | Snapshot value |
|---|---|
| Dataset ID | `d_8b84c4ee58e3cfc0ece0d773c8ca6abc` |
| Publishing agency | Housing & Development Board |
| Format | CSV |
| Status | active |
| Provider update timestamp | 2026-10-21T02:10:17+08:00 |
| Coverage start | 2017-01-01T08:00:00+08:00 |
| Coverage end | 2026-10-01T08:00:00+08:00 |
| Catalog retrieved at | 2026-10-21T15:17:51.033Z |

These values describe the bundled catalog snapshot. Inspect live metadata before relying on coverage, availability, field names, or freshness. A recent update timestamp can refer to a revision of historical data.

## Publisher description

Notes: 1. The approximate floor area includes any recess area purchased, space adding item under HDB’s upgrading programmes, roof terrace, etc. 2. The transactions exclude resale transactions that may not reflect the full market price such as resale between relatives and resale of part shares. 3. Resale prices should be taken as indicative only as the resale prices agreed between buyers and sellers are dependent on many factors.

Description excerpt from the bundled provider metadata; consult the official dataset for complete definitions, footnotes, and terms.

## Inspect before querying

MCP tool call (tool name and arguments):

```json
{
  "name": "singapore_inspect_dataset",
  "arguments": {
    "dataset_id": "d_8b84c4ee58e3cfc0ece0d773c8ca6abc",
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
    "dataset_id": "d_8b84c4ee58e3cfc0ece0d773c8ca6abc",
    "limit": 5,
    "offset": 0
  }
}
```

Inspect the response pagination before requesting another page. A sample is not a full dataset summary. CSV format alone does not guarantee datastore availability; use an export if the provider rejects record queries.

## Specialized tool

This dataset also has the `singapore_query_hdb_resale` tool in the housing topic. It accepts the same query options without a dataset ID:

```json
{
  "name": "singapore_query_hdb_resale",
  "arguments": {
    "limit": 5,
    "offset": 0
  }
}
```

## Export workflow

Use an export when the datastore is unavailable or a complete offline analysis is needed.

```json
{
  "name": "singapore_download_dataset",
  "arguments": {
    "dataset_id": "d_8b84c4ee58e3cfc0ece0d773c8ca6abc",
    "action": "initiate"
  }
}
```

If the result is pending, poll on a later call:

```json
{
  "name": "singapore_download_dataset",
  "arguments": {
    "dataset_id": "d_8b84c4ee58e3cfc0ece0d773c8ca6abc",
    "action": "poll"
  }
}
```

Wait for a ready result before using its download URL. URLs may expire. The tool returns export status and a URL; it does not load the entire exported file into the conversation. Provider availability and quota limits still apply.

## Suggested request

> Inspect dataset d_8b84c4ee58e3cfc0ece0d773c8ca6abc (Resale flat prices based on registration date from Jan-2017 onwards). Explain its coverage, publisher definitions, and available fields. Retrieve five sample records if datastore access is supported. Cite the source and distinguish historical observations from current conditions.

## Interpretation

- Preserve provider units and missing values; do not interpret missing observations as zero.
- Check definitions and population coverage before comparing this dataset with another series.
- Attribute the publishing agency and retain source URLs and observation dates in any analysis.
- This guide contains metadata and request examples. Live record access and export completion have not been verified by generating this page.
