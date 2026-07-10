/**
 * Import / export architecture scaffold (Phase 3).
 * Full Letterboxd / Trakt / IMDb importers ship in a later phase.
 */

export type ImportSource =
  | "letterboxd"
  | "trakt"
  | "imdb"
  | "csv"
  | "json"
  | "frame";

export type ExportFormat = "json" | "csv";

export interface ImportJobPlan {
  source: ImportSource;
  /** Detected columns / fields from the payload. */
  fields: string[];
  /** Estimated rows to import. */
  estimatedRows: number;
  /** Mapping from source field → Argus library field. */
  fieldMap: Record<string, string>;
}

export interface ImportAdapter {
  readonly source: ImportSource;
  /** Parse a raw file/buffer into a normalized plan (dry-run). */
  plan(input: string | ArrayBuffer): Promise<ImportJobPlan>;
  /** Apply import after user confirms mapping. */
  execute(plan: ImportJobPlan, input: string | ArrayBuffer): Promise<{ imported: number }>;
}

/**
 * Registry for future adapters. Do not register incomplete importers yet.
 */
export const importAdapterRegistry: Partial<Record<ImportSource, ImportAdapter>> = {
  // letterboxd: future LetterboxdCsvAdapter
  // trakt: future TraktJsonAdapter
};

export interface ArgusExportPayload {
  version: 1;
  exportedAt: string;
  entries: unknown[];
  collections: unknown[];
  tags: unknown[];
  reviews: unknown[];
  notes: unknown[];
}
