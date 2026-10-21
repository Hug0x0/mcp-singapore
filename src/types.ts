export type Row = Record<string, unknown>;
export interface Dataset {
  dataset_id: string; title: string; description?: string; agency?: string;
  format?: string; updated_at?: string; coverage_start?: string; coverage_end?: string; status?: string;
}
export interface CatalogSnapshot { retrieved_at: string; source: string; pages: number; datasets: Dataset[] }
export interface DatastoreResult {
  resource_id: string; fields: { id: string; type: string }[]; records: Row[];
  total: number; limit: number; _links?: { next?: string; start?: string };
}
export interface SingStatRow { seriesNo: string; rowText: string; uoM: string; footnote?: string; columns: { key: string; value: string }[] }
export interface SingStatData {
  id: string; title: string; frequency: string; dataLastUpdated: string; footnote?: string;
  datasource?: string; row: SingStatRow[]; [key: string]: unknown;
}
