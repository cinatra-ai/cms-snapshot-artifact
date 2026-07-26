"use client";

// The pure, presentational view for a loaded CMS content snapshot — shared by
// the detail renderer and the tests. Takes the raw snapshot bytes, parses them
// with the never-throwing model, and renders the reviewed fields READ-ONLY with
// the reviewed scope visible; a malformed/empty body renders its own never-blank
// floor (raw bytes or a notice). No host ports, no hooks, no side effects — safe
// to render to static markup.

import { type CSSProperties, type ReactNode } from "react";

import { parseCmsFields, scopePaths, type CmsField } from "./cms-model";

const fieldListStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "10px" };

const scopeBoxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "8px 10px",
  borderRadius: "6px",
  background: "var(--muted, #f3f4f6)",
  border: "1px solid var(--border, #e5e7eb)",
};

const scopeLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted-foreground, #6b7280)",
};

const chipRowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "6px" };

const chipStyle: CSSProperties = {
  fontFamily:
    'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',
  fontSize: "11px",
  color: "var(--foreground, #111827)",
  background: "var(--background, #ffffff)",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: "4px",
  padding: "1px 6px",
};

const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 };

const fieldHeadStyle: CSSProperties = { display: "flex", alignItems: "baseline", gap: "8px", minWidth: 0 };

const fieldLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--foreground, #111827)",
};

const fieldPathStyle: CSSProperties = {
  fontFamily:
    'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',
  fontSize: "11px",
  color: "var(--muted-foreground, #6b7280)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const inlineValueStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--foreground, #111827)",
  wordBreak: "break-word",
};

const blockValueStyle: CSSProperties = {
  fontFamily:
    'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',
  fontSize: "12px",
  color: "var(--foreground, #111827)",
  background: "var(--muted, #f3f4f6)",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: "6px",
  padding: "8px 10px",
  margin: 0,
  maxHeight: "320px",
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const noticeStyle: CSSProperties = {
  fontFamily:
    'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',
  fontSize: "12px",
  color: "var(--muted-foreground, #6b7280)",
  padding: "8px 0",
};

const rawStyle: CSSProperties = { ...blockValueStyle, maxHeight: "420px" };

/** The reviewed SCOPE — the closed set of field paths under review. */
export function CmsScope({ paths }: { paths: string[] }): ReactNode {
  return (
    <div style={scopeBoxStyle} data-cms-scope>
      <span style={scopeLabelStyle}>
        Reviewed scope — {paths.length} field{paths.length === 1 ? "" : "s"} under review
      </span>
      <div style={chipRowStyle}>
        {paths.map((p) => (
          <span key={p} style={chipStyle} data-cms-scope-path={p}>
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One reviewed field, read-only. */
export function CmsFieldRow({ field }: { field: CmsField }): ReactNode {
  return (
    <div style={fieldStyle} data-cms-field={field.path}>
      <div style={fieldHeadStyle}>
        <span style={fieldLabelStyle}>{field.label}</span>
        <span style={fieldPathStyle} title={field.path}>
          {field.path}
        </span>
      </div>
      {field.multiline ? (
        <pre style={blockValueStyle} data-cms-field-value>
          {field.value}
        </pre>
      ) : (
        <span style={inlineValueStyle} data-cms-field-value>
          {field.value}
        </span>
      )}
    </div>
  );
}

/**
 * The loaded snapshot view: the reviewed scope + the read-only fields, or a
 * never-blank floor (raw bytes / notice) for a malformed or empty body.
 */
export function CmsFieldsView({ text }: { text: string }): ReactNode {
  const parsed = parseCmsFields(text);
  if (!parsed.ok) {
    return (
      <div style={fieldListStyle} data-cms-detail-malformed>
        <div style={noticeStyle}>
          {parsed.reason === "empty"
            ? "This snapshot has no CMS fields."
            : "The snapshot bytes are not a CMS-fields object; showing the raw content."}
        </div>
        {parsed.reason === "malformed" ? <pre style={rawStyle}>{parsed.raw}</pre> : null}
      </div>
    );
  }
  if (parsed.fields.length === 0) {
    return (
      <div style={noticeStyle} data-cms-detail-nofields>
        This snapshot has no reviewable fields.
      </div>
    );
  }
  return (
    <div style={fieldListStyle}>
      <CmsScope paths={scopePaths(parsed.fields)} />
      <div style={fieldListStyle}>
        {parsed.fields.map((f) => (
          <CmsFieldRow key={f.path} field={f} />
        ))}
      </div>
    </div>
  );
}
