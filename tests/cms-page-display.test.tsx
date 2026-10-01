// @vitest-environment node
// The CMS page display (cinatra#3092): one view drawn from the content alone —
// the page embedded in its frame, beneath it only the changed excerpts in the
// page's own formatting, and a link that opens the page in the CMS. Every arm
// runs for both systems the form serves.

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FRAME_WATCHDOG_MS, frameState } from "../src/cms-page-model";
import { contentFloorMessage } from "../src/content-view";
import CmsSnapshotDetail from "../src/renderers/detail";
import CmsSnapshotPreview from "../src/renderers/preview";
import { PAGE_ADDRESS, PAGE_FORMS, PAGE_TITLE, pageProps, withPage } from "./cms-page-fixture";

const GAP = "The page cannot be shown here. The changes are below.";

function all(html: string, pattern: RegExp): string[] {
  return Array.from(html.matchAll(pattern), (match) => match[1]);
}

const escapeHtml = (value: string): string => value.replace(/&/g, "&amp;");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

for (const fixture of PAGE_FORMS) {
  describe(`the CMS page display — ${fixture.system}`, () => {
    const detail = (document: unknown = fixture.form): string =>
      renderToStaticMarkup(<CmsSnapshotDetail {...pageProps(document)} />);

    it("V1 draws one view: the frame, the changes, the link", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const html = detail();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(all(html, /<iframe\b([^>]*)>/g)).toHaveLength(1);
      expect(html).toContain(`src="${PAGE_ADDRESS}"`);
      expect(html).toContain(`title="${PAGE_TITLE}"`);
      expect(html).toContain(">Changes<");
      expect(html.indexOf("<iframe")).toBeLessThan(html.indexOf(">Changes<"));
      const links = all(html, /<a\b([^>]*)>/g);
      expect(links).toHaveLength(1);
      expect(links[0]).toContain(`href="${escapeHtml(fixture.cmsAddress)}"`);
      expect(links[0]).toContain('target="_blank"');
      expect(links[0]).toContain('rel="noopener noreferrer"');
      expect(html).toContain(">Open in the CMS</a>");
      expect(html.indexOf(">Changes<")).toBeLessThan(html.indexOf("Open in the CMS"));
      expect(html).toContain(`data-cms-system="${fixture.system}"`);
      expect(html).toContain('data-cms-page="page"');
      expect(html).toContain('data-revision="rev_1"');
    });

    it("V2 draws a heading as a heading, a paragraph as a paragraph, a list item as a list item", () => {
      const html = detail();
      expect(all(html, /<[a-z]+\b[^>]*role="heading"[^>]*aria-level="(\d)"/g)).toEqual(["1"]);
      expect(html).toMatch(/<p\b[^>]*data-cms-excerpt="paragraph"/);
      expect(html).toMatch(/<ul\b[^>]*>\s*<li\b[^>]*data-cms-excerpt="list-item"/);
      const heading = html.indexOf('role="heading"');
      const paragraph = html.indexOf('data-cms-excerpt="paragraph"');
      const item = html.indexOf('data-cms-excerpt="list-item"');
      expect(heading).toBeLessThan(paragraph);
      expect(paragraph).toBeLessThan(item);
    });

    it("V3 marks what the change removes and adds in place", () => {
      const html = detail();
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g).map((t) => t.trim())).toEqual([
        "Pricing that grows with you",
        "a price held since 2024,",
        "35",
      ]);
      expect(all(html, /<ins\b[^>]*>([^<]*)<\/ins>/g).map((t) => t.trim())).toEqual([
        "Pricing — 2026 plans",
        "one price change,",
        "39",
      ]);
      expect(html).toContain("Three plans, ");
      expect(html).toContain("and the migration note under each.");
    });

    it("V4 draws the elision between excerpts that are not adjacent", () => {
      const html = detail();
      expect(all(html, /<[a-z]+\b[^>]*aria-hidden="true"[^>]*>(…)</g)).toEqual(["…", "…"]);
    });

    it("V5 names the gap in the frame's place where the page has no framable address", () => {
      const html = detail(withPage(fixture, { address: "http://acme.example/pricing" }));
      expect(html).not.toContain("<iframe");
      expect(html).toMatch(new RegExp(`role="status"[^>]*>${GAP}<`));
      expect(html.indexOf(GAP)).toBeLessThan(html.indexOf(">Changes<"));
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g)).toHaveLength(3);
      expect(html).toContain(">Open in the CMS</a>");
    });

    it("V6 names the gap once the watchdog elapses without a load", () => {
      expect(FRAME_WATCHDOG_MS).toBe(10000);
      expect(frameState({ address: PAGE_ADDRESS, loaded: false, elapsedMs: 10000 })).toBe("gap");
      expect(frameState({ address: PAGE_ADDRESS, loaded: false, elapsedMs: 9999 })).toBe("frame");
      expect(frameState({ address: PAGE_ADDRESS, loaded: true, elapsedMs: 10000 })).toBe("frame");
      expect(frameState({ address: null, loaded: false, elapsedMs: 0 })).toBe("gap");
    });

    it("V7 draws no link without a CMS address", () => {
      for (const cmsAddress of [undefined, "javascript:alert(1)", "http://acme.example/node/7/edit"]) {
        const html = detail(withPage(fixture, { cmsAddress }));
        expect(html).not.toContain("<a ");
        expect(html).not.toContain("Open in the CMS");
        expect(html).toContain("<iframe");
      }
    });

    it("V8 draws no tab strip, no heading of its own, no button and no Verified", () => {
      const html = detail();
      expect(html).not.toContain('role="tab');
      expect(html).not.toMatch(/<h[1-6]\b/);
      expect(all(html, /role="(heading)"/g)).toHaveLength(1);
      expect(html).not.toContain("<button");
      expect(html).not.toMatch(/verified/i);
      expect(html).not.toMatch(/continued/i);
      expect(html).not.toContain("@cinatra-ai/cms-snapshot-artifact");
    });

    it("V9 draws a named floor for a JSON document that is not the form and for a cut projection", () => {
      const other = detail({ "post.title": "New headline" });
      expect(other).toContain('data-cms-detail-floor="content-not-page"');
      expect(contentFloorMessage("content-not-page")).toBe(
        "This artifact holds a document that is not a CMS page, so this view has nothing to draw.",
      );
      expect(other).toContain(contentFloorMessage("content-not-page"));

      const whole = JSON.stringify(fixture.form);
      const prefix = whole.slice(0, 40);
      const cut = renderToStaticMarkup(
        <CmsSnapshotDetail
          {...pageProps(prefix, {
            truncated: true,
            byteLength: Buffer.byteLength(whole, "utf8"),
            projectedByteLength: Buffer.byteLength(prefix, "utf8"),
          })}
        />,
      );
      expect(cut).toContain('data-cms-detail-floor="content-over-cap"');
      expect(cut).not.toContain("<iframe");

      // A cut document is named as cut even when its prefix is only spacing.
      const blank = renderToStaticMarkup(
        <CmsSnapshotDetail
          {...pageProps(" ", { truncated: true, byteLength: Buffer.byteLength(whole, "utf8"), projectedByteLength: 1 })}
        />,
      );
      expect(blank).toContain('data-cms-detail-floor="content-over-cap"');
    });

    it("V10 the preview draws the excerpts without the frame", () => {
      const html = renderToStaticMarkup(<CmsSnapshotPreview {...pageProps(fixture.form)} />);
      expect(html).not.toContain("<iframe");
      expect(html).not.toContain(GAP);
      expect(html).not.toContain("<a ");
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g).map((t) => t.trim())).toEqual([
        "Pricing that grows with you",
        "a price held since 2024,",
        "35",
      ]);
      expect(all(html, /<ins\b[^>]*>([^<]*)<\/ins>/g)).toHaveLength(3);
      expect(html).toContain("data-cms-artifact-preview");
    });

    const withExcerpts = (excerpts: unknown[]): Record<string, unknown> => ({ ...fixture.form, excerpts });
    const textOf = (fragment: string): string => fragment.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
    const blockText = (html: string, pattern: RegExp): string => {
      const found = html.match(pattern);
      expect(found).not.toBeNull();
      return textOf(found![0]);
    };
    const HEADING = /<div\b[^>]*role="heading"[^>]*>.*?<\/div>/s;
    const PARAGRAPH = /<p\b[^>]*data-cms-excerpt="paragraph"[^>]*>.*?<\/p>/s;
    const LIST_ITEM = /<li\b[^>]*data-cms-excerpt="list-item"[^>]*>.*?<\/li>/s;

    it("V11 draws the list excerpt with its list marker, in the detail and in the preview", () => {
      const preview = renderToStaticMarkup(<CmsSnapshotPreview {...pageProps(fixture.form)} />);
      for (const html of [detail(), preview]) {
        const lists = all(html, /<ul\b([^>]*)>/g);
        expect(lists).toHaveLength(1);
        expect(lists[0]).toContain("list-style-type:disc");
      }
    });

    it("V12 separates the struck heading from the added heading by ONE space, in the detail and in the preview", () => {
      const preview = renderToStaticMarkup(<CmsSnapshotPreview {...pageProps(fixture.form)} />);
      for (const html of [detail(), preview]) {
        expect(blockText(html, HEADING)).toBe("Pricing that grows with you Pricing — 2026 plans");
      }
    });

    it("V13 separates a struck word from the word added after it by ONE space in a paragraph and in a list item", () => {
      const html = detail(
        withExcerpts([
          { region: "content", position: 0, kind: "paragraph", published: "Order now", proposed: "Order today" },
          { region: "content", position: 1, kind: "list-item", published: "Ships Monday", proposed: "Ships Friday" },
        ]),
      );
      expect(blockText(html, PARAGRAPH)).toBe("Order now today");
      expect(blockText(html, LIST_ITEM)).toBe("Ships Monday Friday");
      expect(all(html, /<del\b[^>]*>([^<]*)<\/del>/g)).toEqual(["now", "Monday"]);
      expect(all(html, /<ins\b[^>]*>([^<]*)<\/ins>/g)).toEqual(["today", "Friday"]);
    });

    it("V14 keeps the spacing of a run that already carries its own space: never two spaces", () => {
      const html = detail();
      expect(blockText(html, PARAGRAPH)).toBe(
        "Three plans, a price held since 2024, one price change, and the migration note under each.",
      );
      expect(blockText(html, LIST_ITEM)).toBe("Team — 35 39 per seat");
      for (const kind of [HEADING, PARAGRAPH, LIST_ITEM]) expect(blockText(html, kind)).not.toMatch(/ {2}/);
    });
  });
}
