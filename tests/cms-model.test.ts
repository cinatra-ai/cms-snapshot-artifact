import { describe, expect, it } from "vitest";

import { parseCmsFields, scopePaths, summarizeCms, labelForPath } from "../src/cms-model";

describe("parseCmsFields", () => {
  it("parses a flat {path: value} snapshot into ordered, labelled fields", () => {
    const text = JSON.stringify({
      "post.status": "draft",
      "post.content": "Hello **world**",
      "post.title": "My headline",
    });
    const parsed = parseCmsFields(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // Title first, then content, then status (the presentation order).
    expect(parsed.fields.map((f) => f.path)).toEqual(["post.title", "post.content", "post.status"]);
    expect(parsed.fields.map((f) => f.label)).toEqual(["Title", "Content", "Status"]);
    // The reviewed scope is the covered paths.
    expect(scopePaths(parsed.fields)).toEqual(["post.title", "post.content", "post.status"]);
  });

  it("marks the body/long values multiline and short values inline", () => {
    const parsed = parseCmsFields(JSON.stringify({ title: "Short", content: "x" }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const byLabel = Object.fromEntries(parsed.fields.map((f) => [f.label, f]));
    expect(byLabel["Content"].multiline).toBe(true); // Content is always a block
    expect(byLabel["Title"].multiline).toBe(false);
  });

  it("coerces non-string primitives and skips null", () => {
    const parsed = parseCmsFields(JSON.stringify({ "post.sticky": true, "post.order": 3, "post.parent": null }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const map = Object.fromEntries(parsed.fields.map((f) => [f.path, f.value]));
    expect(map["post.sticky"]).toBe("true");
    expect(map["post.order"]).toBe("3");
    expect("post.parent" in map).toBe(false);
  });

  it("reports empty and malformed bodies without throwing (never-blank floor inputs)", () => {
    expect(parseCmsFields("")).toEqual({ ok: false, reason: "empty", raw: "" });
    expect(parseCmsFields("   ")).toMatchObject({ ok: false, reason: "empty" });
    expect(parseCmsFields("not json")).toMatchObject({ ok: false, reason: "malformed" });
    expect(parseCmsFields("[1,2,3]")).toMatchObject({ ok: false, reason: "malformed" });
    expect(parseCmsFields('"a string"')).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("an empty object is ok with zero fields", () => {
    const parsed = parseCmsFields("{}");
    expect(parsed).toEqual({ ok: true, fields: [] });
  });
});

describe("labelForPath", () => {
  it("maps known last-segments and humanizes the rest", () => {
    expect(labelForPath("post.title")).toBe("Title");
    expect(labelForPath("title")).toBe("Title");
    expect(labelForPath("fields.content")).toBe("Content");
    expect(labelForPath("post.featured_image")).toBe("Featured image");
    expect(labelForPath("meta.custom-key")).toBe("Custom key");
  });
});

describe("summarizeCms", () => {
  it("summarizes with the title when present", () => {
    expect(summarizeCms(JSON.stringify({ "post.title": "Hi", "post.content": "x" }))).toBe("2 fields · Hi");
  });
  it("summarizes without a title", () => {
    expect(summarizeCms(JSON.stringify({ "post.status": "draft" }))).toBe("1 field · Status");
  });
  it("is never blank on bad input", () => {
    expect(summarizeCms("")).toBe("No CMS content");
    expect(summarizeCms("nope")).toBe("Unparseable CMS snapshot");
    expect(summarizeCms("{}")).toBe("CMS snapshot (no fields)");
  });
});
