---
title: Make agent dashboards single, self-contained HTML files
description: When an agent builds a dashboard to share, generate one static HTML file from a data file with a script — data embedded, CSS and charts inline, no build step and no third-party requests — so it opens anywhere and can be hosted or attached as is. Show source, data date and generation time, include a table beside every chart, escape all data, keep secrets and unapproved personal data out, check it renders, and regenerate rather than hand-edit.
id: BP-0076
domain: D.SWE.UI
type: pattern
roles: [implementer, reviewer]
stage: [build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-25
related: [BP-0056, BP-0059, BP-0067, BP-0051, BP-0065, BP-0033, BP-0052]
sources:
  - { title: MDN — Content Security Policy, url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP }
  - { title: MDN — Subresource Integrity, url: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity }
  - { title: W3C WAI — Complex images (charts and graphs), url: https://www.w3.org/WAI/tutorials/images/complex/ }
---

The fastest way for an agent to give people a dashboard they can share is a single HTML file: it opens in any browser, can be attached to an email, dropped in a chat, published as a static page or artifact, and printed. No server, no framework build, no account. The catch is that whatever is in the file goes wherever the file goes, and a dashboard nobody can trace back to its data is worse than none.

## Rules

### One file, generated

1. **MUST** generate the dashboard with a script from a data file (JSON or CSV) and a template, and keep the script and template in version control. Regenerate to update; do not hand-edit the HTML.
2. **MUST** make the file self-contained: data embedded, CSS inline, charts as HTML and CSS bars or inline SVG (a small inline script only if interaction needs it), no build step. It must work when opened from disk with no network.
3. **SHOULD** avoid third-party requests (CDNs, web fonts, analytics). If a library is unavoidable, inline it or pin it with Subresource Integrity, and set a Content Security Policy that allows only what the page needs.
4. **SHOULD** keep it small (aim for hundreds of kilobytes, not megabytes): pre-aggregate data in the script rather than shipping raw rows.

### Make it trustworthy

5. **MUST** show on the page: the data source, the date the data is as of, the generation time, and the units. Every number shown should be recomputable from the embedded data ([BP-0052](/agent-engineering/workflow/prevent-and-catch-hallucinations/)).
6. **MUST** compute figures in the script, not in prose written by the model, and state any filters or exclusions.
7. **MUST** provide the data as a table beside or below each chart (or a "view data" toggle), give charts a text title and summary, and not rely on colour alone ([BP-0056](/software-engineering/ui-design-systems/use-style-guides-and-mockups-for-repeated-ui/)).
8. **SHOULD** use the project's style guide tokens, support light and dark schemes, and print cleanly.

### Make it safe to share

9. **MUST** HTML-escape every value taken from data (labels, names, free text); data is untrusted and a label can contain markup.
10. **MUST NOT** embed secrets, tokens, internal URLs with credentials, or personal data beyond what every recipient may see. Anyone who receives the file or link can read everything in it, including data not shown on screen ([BP-0067](/security-safety/data-sovereignty-privacy/keep-agent-data-where-it-is-allowed/), [BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)).
11. **MUST NOT** put live credentials in the browser to fetch data. If the dashboard must be live, have it read a pre-aggregated, read-only JSON endpoint with no secrets, or regenerate the static file on a schedule.
12. **SHOULD** decide where it is shared (attachment, private link, public page) before building, and choose the data level to match.

### Check it

13. **MUST** open the generated file in a headless browser, take a screenshot, and check there are no console errors before sharing it ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).
14. **SHOULD** test the generator with awkward data: empty sets, very long labels, zero and negative values, and labels containing markup.

## When to apply

Status reports, weekly metrics, evaluation and benchmark results ([BP-0065](/operations/evaluation/benchmark-models-on-your-own-tasks/)), workflow observability summaries ([BP-0051](/operations/observability/observe-agent-workflows/)), and any one-off analysis people need to see and pass on.

## Examples

Generator (Bun, no dependencies): bar chart in plain HTML and CSS, total, data table, provenance line, escaping, light and dark via system colours, empty-data message. The output is pure ASCII (non-ASCII characters become numeric entities), so it needs no charset declaration and no script. If you host it rather than attach it, send a Content Security Policy as an HTTP header, for example `default-src 'none'; style-src 'unsafe-inline'`.

```ts
// author: Stephen Eaton
// build-dashboard.ts — turn a JSON data file into one self-contained, shareable HTML dashboard.
// usage: bun build-dashboard.ts data.json dashboard.html
type Row = { label: string; value: number };
type Data = { title: string; source: string; asOf: string; unit: string; rows: Row[] };

// Escape markup and emit non-ASCII as numeric entities: the file is pure ASCII, so it renders
// correctly with no charset declaration, whatever encoding the viewer assumes.
const esc = (s: string) =>
  s.replace(/[&<>"']|[^\x20-\x7e]/gu, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? `&#${c.codePointAt(0)};`);
const num = (n: number) => n.toLocaleString('en-AU');

export function render(d: Data, generated = new Date()): string {
  const max = Math.max(...d.rows.map((r) => Math.abs(r.value)), 1);
  const total = d.rows.reduce((a, r) => a + r.value, 0);
  const bar = (r: Row) =>
    `<div role="listitem" style="display:grid;grid-template-columns:12rem 1fr 5rem;gap:.5rem;align-items:center;margin:.3rem 0">` +
    `<span style="overflow-wrap:anywhere">${esc(r.label)}</span>` +
    `<span style="background:#2f6fde;height:1rem;border-radius:2px;width:${((Math.abs(r.value) / max) * 100).toFixed(1)}%"></span>` +
    `<span style="text-align:right">${num(r.value)}</span></div>`;
  const row = (r: Row) => `<tr><td>${esc(r.label)}</td><td style="text-align:right">${num(r.value)}</td></tr>`;
  const body = d.rows.length
    ? `<div role="list" aria-label="${esc(d.title)}, by category">${d.rows.map(bar).join('')}</div>
<table style="border-collapse:collapse;margin-top:1rem"><caption style="text-align:left">Same data as a table</caption>
<thead><tr><th style="text-align:left">Category</th><th>${esc(d.unit)}</th></tr></thead><tbody>${d.rows.map(row).join('')}</tbody></table>`
    : `<p>No data for this period.</p>`;
  return `<!doctype html><html lang="en"><title>${esc(d.title)}</title>
<body style="color-scheme:light dark;background:Canvas;color:CanvasText;font:15px/1.4 system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem">
<h1>${esc(d.title)}</h1>
<p style="opacity:.75;font-size:.85rem">Source: ${esc(d.source)} | Data as of ${esc(d.asOf)} | Generated ${generated.toISOString().slice(0, 16)}Z</p>
<p><strong style="font-size:2rem">${num(total)}</strong> ${esc(d.unit)} total</p>
${body}
</body></html>`;
}

if (import.meta.main) {
  const [inp, out] = Bun.argv.slice(2);
  await Bun.write(out, render(await Bun.file(inp).json()));
  console.log(`wrote ${out}`);
}
```

Data file:

```json
{ "title": "Agent runs by outcome — week 47", "source": "workflow traces", "asOf": "2026-11-24", "unit": "runs",
  "rows": [ { "label": "completed", "value": 412 }, { "label": "needs human", "value": 37 }, { "label": "failed", "value": 12 } ] }
```

Check before sharing:

```bash
# author: Stephen Eaton
bun build-dashboard.ts data.json dashboard.html
google-chrome --headless=new --screenshot=dashboard.png --window-size=900,700 "file://$PWD/dashboard.html"
```

Tested: the generated file is about 2.3 KB, pure ASCII, contains no script, and renders correctly in headless Chrome in light and dark mode. With awkward data (a label containing an `img` tag with an `onerror` handler, a non-ASCII label, a negative value, a long label, an empty row set), the markup is displayed as text, the accented label renders correctly, and the empty case shows a "no data" message.

## Anti-patterns

- A dashboard built by hand in a chat and edited by hand ever after.
- Charts pulling a library and fonts from public CDNs, so the page breaks offline and leaks views.
- Numbers typed by the model into the HTML instead of computed from data.
- No date, so nobody knows whether it is current.
- A whole customer export embedded "for the filters", shared by link.
- An API key in the page so the chart can fetch live data.

## Checklist

- [ ] Generated by a versioned script from a data file; regenerated, not hand-edited
- [ ] One self-contained file; no build; no third-party requests (or SRI and CSP)
- [ ] Source, data date, generation time and units shown; figures computed in code
- [ ] Table beside every chart; text titles; not colour-only; style guide used
- [ ] All data escaped; no secrets; only data every recipient may see; no live credentials
- [ ] Rendered and screenshotted headless; no console errors; edge cases tested

## References

- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [MDN — Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity)
- [W3C WAI — Complex images](https://www.w3.org/WAI/tutorials/images/complex/)
