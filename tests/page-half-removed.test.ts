// @vitest-environment node
// THE PAGE HALF LIVES IN ITS OWN PACKAGE NOW (cinatra#4366). The page snapshot
// a WordPress or a Drupal agent files, its one view and its row icon are
// declared and drawn by @cinatra-ai/website-artifacts. This package keeps the
// CMS-fields field list, and nothing of the page half: no page module, no page
// type, no row icon, no page MIME, no export of either.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { resolveArtifactTextView } from "../src/content-view";
import * as entry from "../src/index";
import { props, REVISION_ID, textContent } from "./props-fixture";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FIELDS_MIME = "application/vnd.cinatra.cms-fields+json";
const PAGE_TYPE = "@cinatra-ai/cms-snapshot-artifact:cms-page";

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  exports: Record<string, string>;
  cinatra: {
    artifact: {
      accepts: { file: { mimeTypes: string[] } };
      ui: { renderers: Record<string, { representations?: string[] }> };
      objectTypes?: unknown[];
    };
  };
};

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out.sort();
}

describe("the page half is not in this package", () => {
  it("ships no page module and no row icon module", () => {
    for (const file of [
      "src/cms-page-model.ts",
      "src/cms-page-view.tsx",
      "src/renderers/page-frame.tsx",
      "src/renderers/list-row.tsx",
    ]) {
      expect(existsSync(join(ROOT, file)), file).toBe(false);
    }
  });

  it("declares no object type of its own", () => {
    expect(pkg.cinatra.artifact.objectTypes).toBeUndefined();
  });

  it("declares the detail and preview slots only, with no listRow", () => {
    expect(Object.keys(pkg.cinatra.artifact.ui.renderers).sort()).toEqual(["detail", "preview"]);
    expect(Object.keys(entry.cmsSnapshotArtifactManifest.ui.renderers).sort()).toEqual(["detail", "preview"]);
  });

  it("accepts and represents the CMS-fields MIME only", () => {
    expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toEqual([FIELDS_MIME]);
    expect(entry.cmsSnapshotArtifactManifest.accepts.file.mimeTypes).toEqual([FIELDS_MIME]);
    for (const slot of ["detail", "preview"]) {
      expect(pkg.cinatra.artifact.ui.renderers[slot].representations, slot).toEqual([FIELDS_MIME]);
    }
  });

  it("exports no row icon entry and no page member", () => {
    expect(pkg.exports).toEqual({
      ".": "./src/index.ts",
      "./src/renderers/detail": "./src/renderers/detail.tsx",
      "./src/renderers/preview": "./src/renderers/preview.tsx",
    });
    for (const name of [
      "CMS_PAGE_MIME",
      "CMS_PAGE_OBJECT_TYPE",
      "CMS_PAGE_FORM_MARKER",
      "CMS_PAGE_FORM_VERSION",
      "CmsPageView",
      "parseCmsPage",
      "FRAME_WATCHDOG_MS",
      "framableAddress",
      "frameState",
      "wordDiff",
      "excerptGroups",
    ]) {
      expect(name in entry, name).toBe(false);
    }
  });

  it("carries no dependency that only the row icon used", () => {
    expect(pkg.dependencies?.["lucide-react"]).toBeUndefined();
  });

  it("names the page type and the page form nowhere in what it publishes", () => {
    const published = [...filesUnder(join(ROOT, "src")), join(ROOT, "package.json"), join(ROOT, "README.md")];
    const offenders = published
      .filter((file) => {
        const text = readFileSync(file, "utf8");
        return text.includes(PAGE_TYPE) || text.includes("cinatraCmsPage");
      })
      .map((file) => file.slice(ROOT.length));
    expect(offenders).toEqual([]);
  });

  it("resolves a JSON page document to text, never to a page view", () => {
    // A complete, valid page form (one excerpt): the removed page parser
    // accepted exactly this, so it is the input that used to become a page view.
    const form = JSON.stringify({
      cinatraCmsPage: 1,
      system: "wordpress",
      page: { title: "Pricing", address: "https://acme.example/pricing" },
      readAt: "2026-09-29T10:00:00.000Z",
      excerpts: [{ region: "content", position: 0, kind: "paragraph", published: "old", proposed: "new" }],
    });
    const view = resolveArtifactTextView(
      props(textContent(form), { representation: { revisionId: REVISION_ID, mime: "application/json" } }),
    );
    expect(view.kind).toBe("text");
  });
});
