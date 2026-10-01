import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  cmsSnapshotArtifactManifest,
  CMS_PAGE_MIME,
  CMS_PAGE_OBJECT_TYPE,
  CMS_SNAPSHOT_MIME,
  parseCmsPage,
} from "../src/index";
import { PAGE_FORMS } from "./cms-page-fixture";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  cinatra: {
    kind: string;
    apiVersion: string;
    displayName: string;
    artifact: {
      accepts: { file: { mimeTypes: string[] } };
      ui: {
        abiVersion: number;
        sdkAbiRange: string;
        renderers: Record<string, { entry: string; propsApiVersion: number; representations: string[] }>;
      };
      objectTypes: unknown[];
    };
  };
};

describe("manifest — the typed export mirrors package.json byte-for-byte", () => {
  it("names the artifact per the kind convention (@cinatra-ai/<slug>-artifact)", () => {
    expect(pkg.name).toBe("@cinatra-ai/cms-snapshot-artifact");
    expect(pkg.cinatra.kind).toBe("artifact");
    expect(pkg.cinatra.apiVersion).toBe("cinatra.ai/v1");
    expect(pkg.cinatra.displayName).toBe("CMS Snapshot");
  });

  it("claims the CMS-fields MIME and the page content form at both slots", () => {
    expect(CMS_SNAPSHOT_MIME).toBe("application/vnd.cinatra.cms-fields+json");
    expect(CMS_PAGE_MIME).toBe("application/json");
    expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toEqual([CMS_SNAPSHOT_MIME, CMS_PAGE_MIME]);
    for (const slot of ["detail", "preview"] as const) {
      expect(pkg.cinatra.artifact.ui.renderers[slot].representations).toEqual([CMS_SNAPSHOT_MIME, CMS_PAGE_MIME]);
    }
  });

  it("declares exactly one artifact type, the pinnable page type", () => {
    expect(CMS_PAGE_OBJECT_TYPE).toBe("@cinatra-ai/cms-snapshot-artifact:cms-page");
    expect(pkg.cinatra.artifact.objectTypes).toEqual([
      {
        type: CMS_PAGE_OBJECT_TYPE,
        claim: "dedicated",
        dispositions: { projection: "artifact-safe", pinnable: true, snapshotPolicy: "none", sensitivity: "normal" },
        schema: { type: "object" },
      },
    ]);
  });

  it("owns its one type in its own namespace, so the host registers exactly that type", () => {
    const declared = (pkg.cinatra.artifact.objectTypes as Array<{ type: string }>).map((entry) => entry.type);
    const owned = declared.filter((type) => type.slice(0, type.indexOf(":")) === pkg.name);
    expect(owned).toEqual([CMS_PAGE_OBJECT_TYPE]);
    expect(owned).toEqual(declared);
  });

  it("accepts the page content form for its one type", () => {
    expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toContain(CMS_PAGE_MIME);
    const [pageType] = pkg.cinatra.artifact.objectTypes as Array<{ schema: unknown }>;
    expect(pageType.schema).toEqual({ type: "object" });
    for (const fixture of PAGE_FORMS) {
      expect(fixture.form).not.toBeNull();
      expect(typeof fixture.form).toBe("object");
      expect(Array.isArray(fixture.form)).toBe(false);
      expect(parseCmsPage(JSON.stringify(fixture.form)).ok).toBe(true);
    }
  });

  it("the typed manifest equals the package.json artifact.ui descriptor", () => {
    expect(cmsSnapshotArtifactManifest.accepts).toEqual(pkg.cinatra.artifact.accepts);
    expect(cmsSnapshotArtifactManifest.ui).toEqual(pkg.cinatra.artifact.ui);
  });
});
