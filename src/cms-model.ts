// Pure, never-throwing model for a CMS content snapshot
// (`application/vnd.cinatra.cms-fields+json`).
//
// The snapshot bytes are the connector's canonical CMS-fields serialization: a
// FLAT `{ path: value }` JSON object of the reviewed post state — the closed set
// of fields the connector placed under review (the scope). This model parses
// those bytes into an ordered, labelled field list plus the derived scope (the
// set of covered paths), so the renderer can present the change read-only with
// the scope visible. Shared by the renderer and the tests; imports nothing.

/** One reviewed field: its raw `path`, its `value`, a friendly `label`, and
 * whether it reads as a multi-line block. */
export interface CmsField {
  path: string;
  value: string;
  label: string;
  multiline: boolean;
}

/** The total parse result — never throws; a non-object / non-parseable body is
 * reported so the renderer floors to the raw bytes instead of blanking. */
export type CmsFieldsParse =
  | { ok: true; fields: CmsField[] }
  | { ok: false; reason: "empty" | "malformed"; raw: string };

// Friendly labels for the common WordPress/CMS field paths. Keyed on the LAST
// path segment (case-insensitive) so `post.title`, `title`, and `fields.title`
// all resolve — a presentation nicety only; every field renders regardless.
const KNOWN_LABELS: Record<string, string> = {
  title: "Title",
  name: "Title",
  content: "Content",
  body: "Content",
  excerpt: "Excerpt",
  summary: "Excerpt",
  status: "Status",
  slug: "Slug",
  author: "Author",
  date: "Date",
  categories: "Categories",
  tags: "Tags",
};

// Presentation ORDER for the common fields (title first, then the body, then
// metadata). Anything not listed sorts alphabetically after these.
const ORDER = ["title", "name", "content", "body", "excerpt", "summary", "status", "slug"];

function lastSegment(path: string): string {
  const parts = path.split(/[.\/\[\]]+/).filter(Boolean);
  return (parts[parts.length - 1] ?? path).toLowerCase();
}

/** A human label for a field path — a known mapping, else the humanized last
 * segment (`post.featured_image` → "Featured image"). */
export function labelForPath(path: string): string {
  const seg = lastSegment(path);
  if (KNOWN_LABELS[seg]) return KNOWN_LABELS[seg];
  const words = seg.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : path;
}

function isMultiline(label: string, value: string): boolean {
  return label === "Content" || label === "Excerpt" || value.includes("\n") || value.length > 80;
}

function orderRank(path: string): number {
  const idx = ORDER.indexOf(lastSegment(path));
  return idx === -1 ? ORDER.length : idx;
}

/** Coerce a JSON value to a display string. Strings pass through; other
 * primitives stringify; objects/arrays are compact-JSON'd. `null`/`undefined`
 * are dropped by the caller. */
function coerce(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Parse the CMS-fields snapshot bytes into an ordered, labelled field list.
 * Never throws:
 *  - empty/blank body      → `{ ok: false, reason: "empty" }`
 *  - non-object / bad JSON → `{ ok: false, reason: "malformed", raw }`
 *  - a JSON object         → `{ ok: true, fields }` (possibly empty)
 */
export function parseCmsFields(text: string): CmsFieldsParse {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, reason: "empty", raw: text };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, reason: "malformed", raw: text };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "malformed", raw: text };
  }
  const fields: CmsField[] = [];
  for (const [path, raw] of Object.entries(parsed as Record<string, unknown>)) {
    const value = coerce(raw);
    if (value === null) continue;
    const label = labelForPath(path);
    fields.push({ path, value, label, multiline: isMultiline(label, value) });
  }
  fields.sort((a, b) => {
    const ra = orderRank(a.path);
    const rb = orderRank(b.path);
    return ra !== rb ? ra - rb : a.path.localeCompare(b.path);
  });
  return { ok: true, fields };
}

/** The reviewed SCOPE — the closed set of field paths present in the snapshot
 * (the connector serialized exactly the scope-manifest-covered paths). */
export function scopePaths(fields: CmsField[]): string[] {
  return fields.map((f) => f.path);
}

/** A single-line summary for the compact preview slot. Never blank. */
export function summarizeCms(text: string): string {
  const parsed = parseCmsFields(text);
  if (!parsed.ok) return parsed.reason === "empty" ? "No CMS content" : "Unparseable CMS snapshot";
  if (parsed.fields.length === 0) return "CMS snapshot (no fields)";
  const titleField = parsed.fields.find((f) => f.label === "Title");
  const count = `${parsed.fields.length} field${parsed.fields.length === 1 ? "" : "s"}`;
  if (titleField) {
    const t = titleField.value.replace(/\s+/g, " ").trim();
    return t ? `${count} · ${t}` : count;
  }
  return `${count} · ${parsed.fields.slice(0, 3).map((f) => f.label).join(", ")}`;
}
