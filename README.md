# CMS Snapshot

A read-only viewer for CMS content snapshots — the pinned, reviewable state of a CMS change. A snapshot arrives as `application/vnd.cinatra.cms-fields+json`: a flat map of the reviewed post fields (title, content, excerpt, status, and any other in-scope fields). This renderer draws those fields legibly so a reviewer can **see and decide** the change directly on the artifact-review page, with the reviewed **scope** — the exact set of fields under review — shown explicitly. When the content type has no dedicated viewer, a review target has nothing to draw and shows "review target unavailable"; this renderer gives the CMS snapshot a first-class home instead.

Install from the Cinatra marketplace by searching for "CMS Snapshot" and clicking **Add**. No credentials or configuration are required; the renderer is active immediately for every artifact whose content type is `application/vnd.cinatra.cms-fields+json`. Open any such artifact — including a pending CMS review target — to see its detail view rendered as a labelled, read-only field list, or a one-line summary wherever an inline preview appears. If the bytes cannot be parsed as a CMS-fields object, the exact content is shown verbatim with a short diagnostic instead of failing, so the panel is never blank.

## Works with

- Cinatra artifacts — any library item whose content type is `application/vnd.cinatra.cms-fields+json`
- The artifact-review surface — a pending CMS content-snapshot review target renders here so the decision binds to visible content

## Capabilities

- Read the reviewed CMS fields (title, content, excerpt, status, …) as a labelled, read-only list
- See the reviewed scope — the closed set of field paths under review — at a glance
- Read long field values (post body, excerpt) in a scrollable block that never overflows the page
- Fall back to raw, readable bytes when the content is not a valid CMS-fields object
- Preview a snapshot's shape inline as a single summary line
