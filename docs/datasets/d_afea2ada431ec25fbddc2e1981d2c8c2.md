# State Courts Annual Caseload Figures

[Browse dataset guides](README.md) · [Server setup](../../README.md#install-from-source)

Official dataset: [data.gov.sg](https://data.gov.sg/datasets/d_afea2ada431ec25fbddc2e1981d2c8c2/view).

| Catalog field | Snapshot value |
|---|---|
| Dataset ID | `d_afea2ada431ec25fbddc2e1981d2c8c2` |
| Publishing agency | Judiciary, State Courts |
| Format | CSV |
| Status | active |
| Provider update timestamp | 2026-01-21T14:22:34+08:00 |
| Coverage start | 2011-01-01T08:00:00+08:00 |
| Coverage end | 2024-01-01T08:00:00+08:00 |
| Catalog retrieved at | 2026-10-21T15:17:51.033Z |

These values describe the bundled catalog snapshot. Inspect live metadata before relying on coverage, availability, field names, or freshness. A recent update timestamp can refer to a revision of historical data.

## Publisher description

This dataset provides State Courts' annual caseload data by case types, from 2011 to 2024. Notes: (1) Data is accurate as at 31 December 2024. (2) Family and Juvenile cases are excluded from the State Courts caseload figures with effect from 2014. (3) \[Case type: Family and Juvenile, Category: Juvenile Court\] - Beyond Parental Control and Child Protection Orders refers to the number of juveniles. (4) Probate cases are excluded from the State Courts caseload figures with effect from 2015. (5) \[Case type: Criminal, Category: Criminal and Departmental/Statutory Board\] - Criminal charges include District Arrest Case (DAC), Magistrate’s Arrest Case (MAC) and other types of charges. (6) Applications for Protection Order / Non-Publication Order under the Protection from Harassment Act commenced on 15 November 2014. Applications for False Statement Orders came into effect on 1 April 2020, and the Non-Publication Order (NPO) provisions were repealed. The subcategory description of these cases was revised from 'Originating Summons - Application for Protection Order/False Statement Order' to 'Protection from Harassment Court Case' with the operationalisation of the Protection from Harassment…

Description excerpt from the bundled provider metadata; consult the official dataset for complete definitions, footnotes, and terms.

## Inspect before querying

MCP tool call (tool name and arguments):

```json
{
  "name": "singapore_inspect_dataset",
  "arguments": {
    "dataset_id": "d_afea2ada431ec25fbddc2e1981d2c8c2",
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
    "dataset_id": "d_afea2ada431ec25fbddc2e1981d2c8c2",
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
    "dataset_id": "d_afea2ada431ec25fbddc2e1981d2c8c2",
    "action": "initiate"
  }
}
```

If the result is pending, poll on a later call:

```json
{
  "name": "singapore_download_dataset",
  "arguments": {
    "dataset_id": "d_afea2ada431ec25fbddc2e1981d2c8c2",
    "action": "poll"
  }
}
```

Wait for a ready result before using its download URL. URLs may expire. The tool returns export status and a URL; it does not load the entire exported file into the conversation. Provider availability and quota limits still apply.

## Suggested request

> Inspect dataset d_afea2ada431ec25fbddc2e1981d2c8c2 (State Courts Annual Caseload Figures). Explain its coverage, publisher definitions, and available fields. Retrieve five sample records if datastore access is supported. Cite the source and distinguish historical observations from current conditions.

## Interpretation

- Preserve provider units and missing values; do not interpret missing observations as zero.
- Check definitions and population coverage before comparing this dataset with another series.
- Attribute the publishing agency and retain source URLs and observation dates in any analysis.
- This guide contains metadata and request examples. Live record access and export completion have not been verified by generating this page.
