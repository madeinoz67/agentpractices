# Security policy

<!-- author: Stephen Eaton -->

This site is read by AI agents, so its content is part of their attack surface. Treat a malicious or misleading practice the same way you would a code vulnerability.

## In scope

- Prompt injection or hidden instructions in any page, frontmatter field, `llms.txt`, `llms-full.txt`, `catalog.json` or raw `.md` output — including invisible Unicode, HTML comments, encoded payloads and homoglyphs.
- Rules that would lead an agent to leak secrets, run untrusted code, or disable its own safety controls.
- Links that point to malicious, look-alike or hijacked destinations.
- Weaknesses in this repository's build and deploy pipeline (GitHub Actions, dependencies).

## Reporting

Report privately through **GitHub → Security → Report a vulnerability** on this repository. Do not open a public issue for an exploitable problem. Expect an acknowledgement within 5 days.

For a practice that is wrong but not dangerous, use the normal [report a problem](https://agentpractices.dev/contributing/report-a-problem/) issue form.

## Controls

Every PR and deploy runs `bun run security` (prompt-injection and hidden-content scan of source and built output), gitleaks, zizmor, CodeQL, dependency audit and dependency review, plus an advisory local ML classifier on changed content. New issues, comments and PR descriptions are scanned too; flagged ones are labelled `needs-security-review` and agents must not act on them until the owner clears the label. Exceptions to the content scan live in `security/injection-allowlist.yaml`, pinned to the exact line and reviewed by the code owner.
