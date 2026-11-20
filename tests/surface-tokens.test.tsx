// The fields display paints its surfaces with a SURFACE token, never a text
// token (cinatra#4366). In the Cinatra host `--muted` is a TEXT colour and
// `--muted-foreground` aliases it, so a box painted `var(--muted)` is the very
// colour of its own label (invisible count line, inverted in the dark palette).
// The host's muted SURFACE token is `--surface-muted`. `--color-muted` is no
// answer: it is a Tailwind @theme alias that is inlined, not a runtime variable.

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CmsFieldsView } from "../src/cms-view";

const SNAPSHOT = JSON.stringify({
  "post.title": "New headline",
  "post.content": "Line one\nLine two of the body copy under review.",
});

/** The inline style of the first element whose opening tag matches `tag`. */
function styleOf(html: string, tag: RegExp): Record<string, string> {
  const open = html.match(tag);
  expect(open, `no element matching ${tag}`).not.toBeNull();
  const style = /style="([^"]*)"/.exec(open![0]);
  expect(style, `no inline style on ${tag}`).not.toBeNull();
  const out: Record<string, string> = {};
  for (const decl of style![1].replace(/&quot;/g, '"').split(/;(?![^(]*\))/)) {
    const i = decl.indexOf(":");
    if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return out;
}

/** The custom property a `var(--name, fallback)` value names. */
function token(value: string | undefined): string {
  const m = /^var\(\s*(--[\w-]+)/.exec(value ?? "");
  expect(m, `not a var() token: ${value}`).not.toBeNull();
  return m![1];
}

describe("fields display surfaces use a surface token", () => {
  const html = renderToStaticMarkup(<CmsFieldsView text={SNAPSHOT} />);
  const box = styleOf(html, /<div[^>]*data-cms-scope[^>]*>/);
  const label = styleOf(html, /<span[^>]*>Reviewed scope/);
  const block = styleOf(html, /<pre[^>]*data-cms-field-value[^>]*>/);
  const raw = styleOf(renderToStaticMarkup(<CmsFieldsView text="not json" />), /<pre[^>]*>/);

  it("never paints a background with the --muted text colour", () => {
    for (const style of [box, block, raw]) {
      expect(style.background).toBeDefined();
      expect(style.background).not.toMatch(/var\(\s*--muted\b/);
      expect(style.background).not.toMatch(/var\(\s*--muted-foreground\b/);
      expect(style.background).not.toMatch(/var\(\s*--color-muted\b/);
    }
  });

  it("paints the scope box and the content block with --surface-muted", () => {
    expect(token(box.background)).toBe("--surface-muted");
    expect(token(block.background)).toBe("--surface-muted");
    expect(token(raw.background)).toBe("--surface-muted");
  });

  it("keeps the count line's text token different from its background token", () => {
    expect(token(label.color)).not.toBe(token(box.background));
    expect(token(block.color)).not.toBe(token(block.background));
  });
});
