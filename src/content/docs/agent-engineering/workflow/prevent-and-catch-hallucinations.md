---
title: Prevent and catch hallucinations
description: Ground claims in sources the agent fetched, allow and prefer "I don't know", cite every factual claim, check identifiers (packages, APIs, paths, URLs, numbers) mechanically before use, run code instead of trusting it, and verify high-stakes output independently.
id: BP-0052
domain: D.AGT.WF
type: guideline
roles: [any]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0053, BP-0002, BP-0028, BP-0010, BP-0044, BP-0036, BP-0006]
sources:
  - { title: Claude Platform docs — Reduce hallucinations, url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations }
  - { title: 'Spracklen et al. — We Have a Package for You! Package hallucinations by code-generating LLMs (USENIX Security 2025)', url: https://arxiv.org/abs/2406.10279 }
---

A hallucination is output that is stated as fact but is not supported by the inputs or the world: an invented function, package, citation, file, number or event. Techniques reduce it; none remove it. Design so the ones that get through are caught before they do harm.

## Rules

### Ground

1. **MUST** look up, rather than recall, anything specific or current: API signatures, versions, config keys, prices, who holds a role, what a file contains. Use the code index, docs, search or the file itself ([BP-0010](/agent-engineering/context-memory/use-a-code-index/), [BP-0028](/agent-engineering/context-memory/retrieve-context-well/)).
2. **SHOULD** restrict the agent to the supplied sources when the task is about those sources ("answer only from these documents"), and for long documents have it extract the relevant quotes first and reason from those.
3. **MUST** give the agent explicit permission to say "I don't know" or "not found", and treat that as a valid result, not a failure to retry until it guesses.

### Cite

4. **MUST** attach a source to every factual claim that matters: URL, document and quote, or `file:line`. Remove or mark any claim the agent cannot support.
5. **MUST** mark the status of what is reported: verified (checked against a source or by running it), unverified, or assumption. Do not present unverified as verified.

### Check identifiers mechanically

6. **MUST** check that a package exists in the registry, is the one intended, and is trustworthy (publisher, age, downloads) before adding or installing it. Code-generating models invent package names, and attackers register those names ([BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/)).
7. **MUST** check functions, flags and options against the installed version (types, `--help`, docs for that version); check that paths exist and URLs resolve before citing them.
8. **MUST** compute numbers with code, not in prose, and re-derive any figure copied between documents.
9. **MUST** run what can be run: type-check, build and test code before claiming it works ([BP-0002](/agent-engineering/workflow/plan-execute-verify/)).

### Verify

10. **SHOULD** for high-stakes answers, sample more than once and treat disagreement between runs as a warning that needs a source.
11. **SHOULD** have a reviewer with fresh context check claims against the cited sources, not against the author's reasoning ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).
12. **SHOULD** measure hallucination rate in evaluations (unsupported claims, non-existent identifiers, broken citations) and keep every real one as a regression case ([BP-0006](/operations/evaluation/evaluate-agent-output/)).

## When to apply

Every agent that states facts, writes code or cites sources; strictest where output is acted on without a human reading it.

## Examples

Package check before install (Bun):

```ts
// author: Stephen Eaton
// pkg-check.ts — usage: bun pkg-check.ts <npm-package> [minAgeDays]
export async function checkNpm(name: string, minAgeDays = 90) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name).replace('%40', '@')}`);
  if (res.status === 404) return { ok: false, reason: 'does not exist (possible hallucination)' };
  if (!res.ok) return { ok: false, reason: `registry error ${res.status}` };
  const meta: any = await res.json();
  const created = new Date(meta.time?.created ?? 0);
  const ageDays = (Date.now() - created.getTime()) / 86_400_000;
  if (ageDays < minAgeDays) return { ok: false, reason: `only ${Math.floor(ageDays)} days old — review before use` };
  return { ok: true, latest: meta['dist-tags']?.latest, created: created.toISOString().slice(0, 10) };
}

if (import.meta.main) {
  const [name, min] = Bun.argv.slice(2);
  const r = await checkNpm(name, min ? Number(min) : undefined);
  console.log(name, r);
  process.exit(r.ok ? 0 : 1);
}
```

Instruction snippet for an agent file:

```markdown
- If you cannot find a source, say "not found" — do not guess.
- Cite every factual claim as URL + quote or file:line.
- Mark each result verified / unverified / assumption.
- Check package names in the registry before adding them.
```

## Anti-patterns

- Retrying until the agent produces *an* answer instead of accepting "not found".
- Citations that were never opened, or that do not contain the claim.
- `npm install` of a package name the model suggested, unchecked.
- Prose arithmetic in reports.
- "Tested" with no test run in the log.

## Checklist

- [ ] Specific and current facts looked up, not recalled
- [ ] "I don't know" allowed and accepted
- [ ] Claims cited; status (verified / unverified / assumption) shown
- [ ] Packages, APIs, paths, URLs and numbers checked mechanically
- [ ] Code run before claimed working; high-stakes output independently verified

## References

- [Claude Platform — Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- [Spracklen et al. — We Have a Package for You!](https://arxiv.org/abs/2406.10279)
