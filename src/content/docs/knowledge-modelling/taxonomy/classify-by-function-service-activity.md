---
title: Classify by function, service and activity, not by org chart or system
description: Build classification schemes for records, knowledge, tickets and agent work from what the organisation does — functions, then the services that deliver them, then the activities that make up each service — so the scheme survives restructures and system changes; keep org units, systems, locations and dates as facets, file every item at an activity, and validate the scheme in code.
id: BP-0079
domain: D.KNO.TAX
type: guideline
roles: [planner, implementer, reviewer]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0004, BP-0024, BP-0026, BP-0025, BP-0014, BP-0062]
sources:
  - title: "National Archives of Australia — Classifying information (functions, activities, transactions)"
    url: https://www.naa.gov.au/information-management/describing-information/classifying-information
    note: Australian government guidance that puts functions at the top and keeps org units and systems out of the hierarchy
  - title: "National Archives of Australia — Develop a business or records classification scheme"
    url: https://www.naa.gov.au/node/3613
    note: Method for drafting a scheme from what the organisation does and testing it against real records
  - title: "Northern Territory Government — Business classification scheme, analyse"
    url: https://dcdd.nt.gov.au/government-records/business-classification-scheme-bcs/analyse
    note: Analysis steps for deriving function, service and activity levels from business evidence before drafting
  - title: "ISO 15489-1:2016 Records management — Concepts and principles"
    url: https://www.iso.org/standard/62542.html
    note: Records management principles requiring systematic classification tied to business activity, so retention and access attach consistently
  - title: "esd standards (LGA) — Function List"
    url: https://interoperable-europe.ec.europa.eu/collection/esd-standards/solution/function-list
    note: Published function and service lists for UK local government, a scheme to reuse or map local terms onto
  - title: "ICRM — Functional records classification, clarification and effective usage"
    url: https://www.icrm.org/sites/default/files/2024-12/Functional%20Records%20Classification_Clarification%20and%20Effective%20Usage.pdf
    note: Argues functional classification outlasts restructures and explains how to keep org units and systems as facets
---
## Rules

### Build the hierarchy from what the organisation does

1. **MUST** make functions the top level: the areas of responsibility the organisation manages to meet its goals (for example *Technology Management*, *Financial Management*). Functions outlive restructures, system replacements and changes of supplier; org units, applications and subjects do not.
2. **MUST** put services under each function: what the function delivers to someone, internal or external (for example *Endpoint Management* under *Technology Management*). Put activities under each service: the major tasks or processes that deliver it (for example *Device Enrolment*, *Patch Deployment*). Use transactions or topics below an activity only where titling or retention needs them.
3. **MUST** divide each level on one principle: functions by area of responsibility, services by what is delivered, activities by process. A level that mixes processes with products, places or teams is two schemes in one.
4. **MUST** give every node a stable ID, one label, a definition and a scope note that says what is included and excluded ([BP-0024](/knowledge-modelling/semantics-metadata/define-terms-once/), [BP-0004](/knowledge-modelling/taxonomy/apply-a-taxonomy/)). IDs never change or get reused; a node that goes is deprecated with a pointer to its replacement.

### Keep everything else out of the levels

5. **MUST** record org unit, system, location, sensitivity, record type and date as facets or properties on items, never as levels. Map org units to the functions they perform and systems to the services they support in separate tables, so a restructure or a new platform changes a mapping, not the scheme.
6. **MUST NOT** create catch-all nodes (*General*, *Miscellaneous*, *Other*, *Administration*). An item that fits no activity is a gap candidate for the scheme's owner ([BP-0014](/knowledge-modelling/ontology/close-corpus-coverage-gaps/)), not a reason for a bucket.
7. **MUST** file every item (record, document, ticket, dataset, agent task) under exactly one activity, not under a service or function, so retention, access and reporting attach at one consistent level.

### Reuse, then test

8. **SHOULD** start from a published functional scheme where one fits and map local terms to it ([BP-0026](/knowledge-modelling/semantics-metadata/map-between-vocabularies/)): AGIFT, Keyword AAA and AFDA Express functions for Australian government, the LGA Function and Service lists for UK local government, your service catalogue (for example ITIL or ServiceNow CSDM business services) for IT.
9. **MUST** draft the scheme from interviews and real material, then confirm it with the people who do the work, and test it on a sample of real items: every item lands on one activity without debate, and no activity is empty.
10. **MUST** validate the scheme in code before publishing it and on every change: unique IDs, definitions and scope notes present, no facet values used as levels, no catch-alls, items only at activity level.
11. **SHOULD** test restructure resilience: rename or merge two org units and replace a platform in the facet tables; no item should change its activity.

### Use it for agents

12. **SHOULD** align agent work with the same hierarchy: route requests by service, scope a sub-agent's tools and knowledge to the service it serves ([BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/)), and tag agent outputs with the activity ID so retention and access rules apply to them like any other record.

## When to apply

When designing or reviewing a records classification scheme or file plan, a tag hierarchy for a document system (for example Paperless-ngx or SharePoint), a service catalogue, a knowledge base an agent retrieves from, or the routing table for a multi-agent system.

## Examples

A scheme with facets declared separately (`scheme.yaml`). `INC-2208` is filed at a service, which rule 7 forbids:

```yaml
facets:
  org_unit: [Service Desk, Endpoint Engineering]
  platform: [Intune, SCCM]
functions:
  - id: F01
    label: Technology Management
    definition: Managing the technology the organisation depends on to do its work.
    scope_note: Includes devices, applications and identity. Excludes telephony (F04).
    services:
      - id: F01.S01
        label: Endpoint Management
        definition: Keeping user devices secure, compliant and usable.
        scope_note: Laptops, desktops and mobiles. Servers are F01.S03.
        activities:
          - { id: F01.S01.A01, label: Device Enrolment, definition: Bringing a device under management., scope_note: Includes Autopilot and re-imaging. }
          - { id: F01.S01.A02, label: Patch Deployment, definition: Applying vendor updates to managed devices., scope_note: OS and third-party updates. }
          - { id: F01.S01.A03, label: Compliance Reporting, definition: Showing which devices meet policy., scope_note: Excludes security incidents (F02). }
items:
  - { id: CHG-1042, activity: F01.S01.A02, org_unit: Endpoint Engineering, platform: SCCM }
  - { id: INC-2208, activity: F01.S01, org_unit: Service Desk, platform: Intune }
```

Validator (Bun), run in CI on every change to the scheme:

```ts
// author: Stephen Eaton
// check-fsa.ts — validate a function → service → activity classification scheme and the items filed in it.
// usage: bun check-fsa.ts scheme.yaml
type Node = { id: string; label: string; definition: string; scope_note: string };
type Activity = Node;
type Service = Node & { activities: Activity[] };
type Fn = Node & { services: Service[] };
type Item = { id: string; activity: string } & Record<string, string>;
export type Scheme = { facets: Record<string, string[]>; functions: Fn[]; items: Item[] };
type Problem = { code: string; msg: string };

const CATCH_ALL = /^(general|misc(ellaneous)?|other|various|admin(istration)?)$/i;

export function validate(s: Scheme): Problem[] {
  const out: Problem[] = [];
  const add = (code: string, msg: string) => out.push({ code, msg });
  const facetValues = new Map(Object.values(s.facets ?? {}).flat().map((v) => [v.toLowerCase(), true]));
  const seen = new Set<string>();
  const activities = new Set<string>();
  const nonLeaf = new Set<string>();
  const check = (n: Node, level: string) => {
    if (seen.has(n.id)) add('E_DUP_ID', `${n.id}: ID used twice`);
    seen.add(n.id);
    if (!n.definition?.trim() || !n.scope_note?.trim()) add('E_DEFINE', `${n.id} ${level}: needs a definition and a scope note`);
    if (facetValues.has(n.label.toLowerCase())) add('E_FACET_AS_LEVEL', `${n.id}: "${n.label}" is a facet value (org unit, system...), not a ${level}`);
    if (CATCH_ALL.test(n.label.trim())) add('E_CATCH_ALL', `${n.id}: "${n.label}" is a catch-all; name the real ${level} or record a gap`);
  };
  for (const f of s.functions ?? []) {
    check(f, 'function'); nonLeaf.add(f.id);
    if (!f.services?.length) add('E_EMPTY', `${f.id}: function has no services`);
    for (const sv of f.services ?? []) {
      check(sv, 'service'); nonLeaf.add(sv.id);
      if (!sv.activities?.length) add('E_EMPTY', `${sv.id}: service has no activities`);
      for (const a of sv.activities ?? []) { check(a, 'activity'); activities.add(a.id); }
    }
  }
  for (const it of s.items ?? []) {
    if (!activities.has(it.activity))
      add('E_ITEM_LEVEL', `${it.id}: filed under ${it.activity}, which is ${nonLeaf.has(it.activity) ? 'a function or service' : 'unknown'}; file under an activity`);
    for (const [facet, allowed] of Object.entries(s.facets ?? {}))
      if (it[facet] !== undefined && !allowed.includes(it[facet])) add('E_ITEM_FACET', `${it.id}: ${facet} "${it[facet]}" is not a declared value`);
  }
  return out;
}

if (import.meta.main) {
  const scheme = Bun.YAML.parse(await Bun.file(Bun.argv[2]).text()) as Scheme;
  const problems = validate(scheme);
  for (const p of problems) console.error(`${p.code} ${p.msg}`);
  console.log(`${scheme.functions.length} function(s), ${scheme.items?.length ?? 0} item(s): ${problems.length} problem(s)`);
  process.exit(problems.length ? 1 : 0);
}
```

Output for the scheme above (exit code 1):

```text
E_ITEM_LEVEL INC-2208: filed under F01.S01, which is a function or service; file under an activity
1 function(s), 2 item(s): 1 problem(s)
```

Tested with Bun 1.4 and eight unit tests: the well-formed scheme passes, and a missing scope note, a duplicate ID, a platform name used as a service ("Intune"), a "General" activity, an item filed at a service, an undeclared org unit on an item, and a service with no activities each produce their error.

Compared with an org-chart scheme: if *Endpoint Engineering* merges into *Service Desk*, only the `org_unit` facet values change; every item keeps its activity, retention and access.

## Anti-patterns

- Top levels named after departments or teams, rebuilt after every restructure.
- Levels named after applications ("Intune", "SharePoint"), so a migration breaks the scheme.
- A subject-based tree that files the same work in several places.
- *General* or *Other* nodes that grow until they hold a large share of items.
- Items filed at function or service level because the activity was unclear.
- Location, year or status encoded as levels instead of facets.

## Checklist

- [ ] Functions at the top, services under functions, activities under services; one principle of division per level
- [ ] Every node has a stable ID, label, definition and scope note
- [ ] Org unit, system, location, sensitivity and date are facets, mapped in separate tables
- [ ] No catch-all nodes; unfiled items become gap candidates
- [ ] Every item filed at exactly one activity
- [ ] Published scheme reused or mapped where one fits
- [ ] Draft confirmed with the people doing the work and tested on real items
- [ ] Scheme validated in CI; restructure test passes
