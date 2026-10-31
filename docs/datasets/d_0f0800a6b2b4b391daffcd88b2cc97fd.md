# Government Fiscal Position

[Browse dataset guides](README.md) · [Server setup](../../README.md#install-from-source)

Official dataset: [data.gov.sg](https://data.gov.sg/datasets/d_0f0800a6b2b4b391daffcd88b2cc97fd/view).

| Catalog field | Snapshot value |
|---|---|
| Dataset ID | `d_0f0800a6b2b4b391daffcd88b2cc97fd` |
| Publishing agency | Ministry of Finance |
| Format | CSV |
| Status | active |
| Provider update timestamp | 2026-02-20T17:52:57+08:00 |
| Coverage start | Not supplied |
| Coverage end | Not supplied |
| Catalog retrieved at | 2026-10-21T15:17:51.033Z |

These values describe the bundled catalog snapshot. Inspect live metadata before relying on coverage, availability, field names, or freshness. A recent update timestamp can refer to a revision of historical data.

## Publisher description

Operating Revenue refers to Government receipts credited to the Consolidated Revenue Account and Development Fund Account, excluding Investment and Interest Income, and Capital Receipts (lumpy and less regular in timing). The main components are Tax Revenue and Fees and Charges. Total Expenditure comprises Operating and Development Expenditure. Operating expenditures are expenses incurred to maintain the operations and regular activities of the Government, and Government grants and transfers. They include expenditure on manpower, other operating expenditure, grants, transfers and capital injections to Statutory Boards and other organisations, and other transfers. Agency fees on land sales, investment expenses, SINGA-related outlays and net disbursements of advances are excluded. Development expenditures are expenses that represent a longer-term investment and/or are incurred on capital assets in respect of or in connection with the economic development or general welfare of Singapore. Examples of spending areas are on the acquisition of heavy equipment and capital assets, e.g. buildings and roads. Land-related expenditure (from FY2001) and net lending are excluded. Special Transfer…

Description excerpt from the bundled provider metadata; consult the official dataset for complete definitions, footnotes, and terms.

## Inspect before querying

MCP tool call (tool name and arguments):

```json
{
  "name": "singapore_inspect_dataset",
  "arguments": {
    "dataset_id": "d_0f0800a6b2b4b391daffcd88b2cc97fd",
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
    "dataset_id": "d_0f0800a6b2b4b391daffcd88b2cc97fd",
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
    "dataset_id": "d_0f0800a6b2b4b391daffcd88b2cc97fd",
    "action": "initiate"
  }
}
```

If the result is pending, poll on a later call:

```json
{
  "name": "singapore_download_dataset",
  "arguments": {
    "dataset_id": "d_0f0800a6b2b4b391daffcd88b2cc97fd",
    "action": "poll"
  }
}
```

Wait for a ready result before using its download URL. URLs may expire. The tool returns export status and a URL; it does not load the entire exported file into the conversation. Provider availability and quota limits still apply.

## Suggested request

> Inspect dataset d_0f0800a6b2b4b391daffcd88b2cc97fd (Government Fiscal Position). Explain its coverage, publisher definitions, and available fields. Retrieve five sample records if datastore access is supported. Cite the source and distinguish historical observations from current conditions.

## Interpretation

- Preserve provider units and missing values; do not interpret missing observations as zero.
- Check definitions and population coverage before comparing this dataset with another series.
- Attribute the publishing agency and retain source URLs and observation dates in any analysis.
- This guide contains metadata and request examples. Live record access and export completion have not been verified by generating this page.
