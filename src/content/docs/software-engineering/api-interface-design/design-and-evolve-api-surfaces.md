---
title: Design API surfaces contract-first and evolve them without breaking clients
description: Choose REST, RPC (gRPC, JSON-RPC), GraphQL or events by the interaction, not by habit; write the contract first (OpenAPI, Protobuf, GraphQL schema, AsyncAPI) and treat it as the source of truth; make operations clear enough for people and agents to call correctly; standardise errors, idempotency, pagination and limits; block breaking changes in CI; and deprecate with notice, headers and dates before removing anything.
id: BP-0071
domain: D.SWE.API
type: guideline
roles: [planner, implementer, reviewer]
stage: [plan, build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-25
related: [BP-0001, BP-0055, BP-0058, BP-0037, BP-0034, BP-0043, BP-0024]
sources:
  - { title: OpenAPI Specification v3.2.0, url: https://spec.openapis.org/oas/v3.2.0.html }
  - { title: 'RFC 9457 — Problem Details for HTTP APIs', url: https://www.rfc-editor.org/rfc/rfc9457 }
  - { title: 'RFC 9745 — The Deprecation HTTP Response Header Field', url: https://www.rfc-editor.org/rfc/rfc9745 }
  - { title: 'RFC 8594 — The Sunset HTTP Header Field', url: https://www.rfc-editor.org/rfc/rfc8594 }
  - { title: oasdiff — breaking-change detection for OpenAPI, url: https://github.com/oasdiff/oasdiff }
  - { title: Buf — breaking-change detection for Protobuf, url: https://buf.build/docs/breaking/ }
---

An API is a promise to every client, including the agents that will call it, generate SDKs from it, or turn it into tools. Agents also write and change APIs quickly, which makes accidental breaking changes cheap to produce and expensive to discover. The contract has to be explicit, checked by machine, and changed deliberately.

## Rules

### Choose the style by the interaction

1. **SHOULD** choose the style deliberately:

   | Style | Fits | Contract |
   | --- | --- | --- |
   | REST over HTTP | Resources with CRUD-like operations; public and partner APIs; caching | OpenAPI (3.2.0 is current) |
   | gRPC | Service-to-service, low latency, streaming, strong typing across languages | Protobuf |
   | JSON-RPC | Simple command-style calls; the base of MCP and some agent protocols | JSON Schema per method |
   | GraphQL | Clients that need flexible reads across many related types | GraphQL schema |
   | Events / messages | Asynchronous notifications, decoupled consumers | AsyncAPI, CloudEvents |

2. **MUST** use one style per surface and keep it consistent; mixing conventions inside one API is a defect.

### Contract first

3. **MUST** write or update the contract before or with the implementation, keep it in version control, and treat it as the source of truth for docs, SDKs, mocks, contract tests and any tools or MCP servers generated from it.
4. **MUST** lint the contract against a style guide (naming, casing, pagination, error format, security schemes) in CI.
5. **MUST** make every operation understandable without reading the code, because agents select and call operations from these descriptions: a stable operation ID, a summary that says what it does and when to use it, documented parameters with types, formats and limits, examples for requests and responses, and every error it can return ([BP-0024](/knowledge-modelling/semantics-metadata/define-terms-once/)).

### Standard behaviour

6. **MUST** return errors in one machine-readable shape. For HTTP APIs, use Problem Details (RFC 9457) with a stable `type` per error, so clients and agents can branch on it.
7. **MUST** make retried writes safe: idempotency keys (or naturally idempotent operations) for anything that creates, charges or sends.
8. **MUST** bound responses: pagination (cursor-based for large or changing sets), field selection or sparse responses where useful, and documented maximums.
9. **MUST** document and signal limits and quotas, and return a retry hint when a client is throttled.
10. **MUST** secure every operation explicitly (authentication scheme, scopes per operation), least privilege by default, and never accept credentials in query strings.

### Evolve without breaking

11. **MUST** run breaking-change detection on every change in CI, comparing the proposed contract with the released one, and fail the build on breaking changes that have not been approved (for example `oasdiff breaking` for OpenAPI, `buf breaking` for Protobuf).
12. **MUST** prefer additive change: new optional fields, new operations, new enum values only where clients are documented to tolerate unknown values. Renaming, removing, retyping, tightening validation or changing defaults is breaking.
13. **MUST** deprecate before removing: mark it deprecated in the contract, announce it with a migration guide and a date, send `Deprecation` (RFC 9745) and `Sunset` (RFC 8594) headers on HTTP responses, watch usage, and remove only after the sunset date when usage is gone or owners have agreed.
14. **SHOULD** version only for breaking changes, and keep at most a small number of major versions live.
15. **MUST** run contract tests for providers and their known consumers, and record API changes in a changelog generated from the contract diff ([BP-0037](/software-engineering/testing/test-first-with-agents/)).

### When agents change APIs

16. **MUST** require agents to change the contract in the same change as the implementation, run lint and breaking-change checks, and explain any breaking change in the pull request for human approval ([BP-0034](/software-engineering/version-control-review/make-agent-commits-reviewable/)).
17. **MUST NOT** let an agent remove, rename or retype a public operation or field without an approved deprecation plan.

## When to apply

Designing a new API, changing an existing one, generating tools or MCP servers from an API, and reviewing agent-written changes to service interfaces.

## Examples

OpenAPI operation written for people and agents:

```yaml
# author: Stephen Eaton
openapi: 3.2.0
info: { title: Orders API, version: 2.4.0 }
paths:
  /orders/{orderId}/refunds:
    post:
      operationId: createRefund
      summary: Refund part or all of a paid order. Use only after the return is confirmed.
      parameters:
        - { name: orderId, in: path, required: true, schema: { type: string, pattern: '^ord_[a-z0-9]{12}$' } }
        - { name: Idempotency-Key, in: header, required: true, schema: { type: string, maxLength: 64 } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [amount, currency, reason]
              properties:
                amount:   { type: integer, minimum: 1, description: Minor units (cents). Must not exceed the amount still refundable. }
                currency: { type: string, enum: [AUD, NZD] }
                reason:   { type: string, enum: [returned, damaged, duplicate_charge] }
            example: { amount: 18450, currency: AUD, reason: returned }
      responses:
        '201': { description: Refund created }
        '409': { description: Refund exceeds refundable amount, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
        '429': { description: Rate limited; retry after the Retry-After header }
      security: [{ oauth: [refunds:write] }]
components:
  schemas:
    Problem:            # RFC 9457
      type: object
      properties:
        type:   { type: string, format: uri-reference }
        title:  { type: string }
        status: { type: integer }
        detail: { type: string }
  securitySchemes:
    oauth:
      type: oauth2
      flows: { clientCredentials: { tokenUrl: https://auth.example.com/token, scopes: { 'refunds:write': Create refunds } } }
```

Deprecation on the wire:

```http
HTTP/1.1 200 OK
Deprecation: @1798761600
Sunset: Wed, 30 Jun 2027 23:59:59 GMT
Link: <https://developer.example.com/migrate/orders-v3>; rel="deprecation"; type="text/html"
```

CI gate:

```bash
# author: Stephen Eaton
oasdiff breaking released/openapi.yaml openapi.yaml --fail-on ERR
buf breaking --against '.git#branch=main'
```

## Anti-patterns

- Implementation first, contract generated afterwards and never reviewed.
- "Get it working" summaries such as `operationId: post2` with no description.
- Different error shapes per endpoint.
- Renaming a field because it reads better.
- Removing a deprecated endpoint with no notice, dates or usage check.
- Agents regenerating the contract from code and committing the diff unread.

## Checklist

- [ ] Style chosen for the interaction; one style per surface
- [ ] Contract in version control, linted, source of truth for docs, SDKs, tools
- [ ] Operations described for people and agents: IDs, summaries, types, limits, examples, errors
- [ ] Standard errors (RFC 9457), idempotency keys, pagination, limits, explicit security
- [ ] Breaking-change detection in CI; additive by default
- [ ] Deprecation with notice, Deprecation/Sunset headers and usage tracking before removal
- [ ] Agents change contract and code together; breaking changes need human approval

## References

- [OpenAPI Specification v3.2.0](https://spec.openapis.org/oas/v3.2.0.html)
- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [RFC 9745 — Deprecation header](https://www.rfc-editor.org/rfc/rfc9745)
- [RFC 8594 — Sunset header](https://www.rfc-editor.org/rfc/rfc8594)
- [oasdiff](https://github.com/oasdiff/oasdiff)
- [Buf — breaking change detection](https://buf.build/docs/breaking/)
