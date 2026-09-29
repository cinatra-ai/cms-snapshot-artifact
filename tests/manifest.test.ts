import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { cmsSnapshotArtifactManifest, CMS_PAGE_MIME, CMS_PAGE_OBJECT_TYPE, CMS_SNAPSHOT_MIME } from "../src/index";

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

  it("declares the pinnable page type beside the existing claim", () => {
    expect(CMS_PAGE_OBJECT_TYPE).toBe("@cinatra-ai/cms-snapshot-artifact:cms-page");
    expect(pkg.cinatra.artifact.objectTypes).toEqual([
      {
        type: "@cinatra-ai/cms-snapshot-artifact:artifact",
        claim: "dedicated",
        dispositions: { projection: "artifact-safe", pinnable: false, snapshotPolicy: "none", sensitivity: "normal" },
        schema: { type: "object" },
      },
      {
        type: CMS_PAGE_OBJECT_TYPE,
        claim: "dedicated",
        dispositions: { projection: "artifact-safe", pinnable: true, snapshotPolicy: "none", sensitivity: "normal" },
        schema: { type: "object" },
      },
    ]);
  });

  it("the typed manifest equals the package.json artifact.ui descriptor", () => {
    expect(cmsSnapshotArtifactManifest.accepts).toEqual(pkg.cinatra.artifact.accepts);
    expect(cmsSnapshotArtifactManifest.ui).toEqual(pkg.cinatra.artifact.ui);
  });
});
