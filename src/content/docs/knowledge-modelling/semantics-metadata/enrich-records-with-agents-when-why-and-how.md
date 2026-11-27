---
title: "Enrich records with agents: when, why, and how"
description: "Enrich a record only for a named reader: decide when to enrich, the lowest model level that holds and whether processing runs locally or with an external provider, keep derived values apart from the source, and give images parsed metadata, checkable descriptions and text alternatives by role."
id: BP-0107
domain: D.KNO.SEM
type: guideline
roles: [planner, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-02-27
related: [BP-0004, BP-0005, BP-0006, BP-0025, BP-0027, BP-0031, BP-0041, BP-0046, BP-0049, BP-0053, BP-0064, BP-0067, BP-0082]
superseded_by: null
sources:
  - title: "W3C — Web Annotation Data Model"
    url: https://www.w3.org/TR/annotation-model/
    note: "An annotation keeps its derived information beside the target resource and records who generated it and when; the shape of rules 4 and 5"
  - title: "Elasticsearch Reference — Enrich processor"
    url: https://www.elastic.co/docs/reference/ingest-processor/enrich-processor
    note: "A production enricher that writes looked-up data to a separate target field under a named policy; the pattern rule 4 generalises"
  - title: "Anthropic — Effective context engineering for AI agents"
    url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    note: "The smallest set of high-signal tokens and just-in-time retrieval; the basis for enriching only for a named consumer and for choosing between ingest and use"
  - title: "OWASP Gen AI Security Project — LLM01:2026 Prompt Injection"
    url: https://genai.owasp.org/llm2026/llm012026-prompt-injection/
    note: "Images, tool output and retrieved content are prompt-injection surfaces, including instructions hidden in an image below human sight; rule 8"
  - title: "ISACA — What to know about EXIF data, a more subtle cybersecurity risk"
    url: https://www.isaca.org/resources/news-and-trends/industry-news/2025/what-to-know-about-exif-data-a-more-subtle-cybersecurity-risk
    note: "Embedded image metadata can reveal a location, a device and a person without the knowledge of the subject; rules 9 and 10"
  - title: "IPTC — Photo Metadata Standard 2025.1"
    url: https://www.iptc.org/std/photometadata/specification/IPTC-PhotoMetadata-2025.1.html
    note: "The embedded image metadata fields, including Alt Text (Accessibility) and Location Created, that a parser reads and a model does not; rules 18 and 21"
  - title: "OpenAI — Analyze images"
    url: https://developers.openai.com/api/docs/guides/images-vision
    note: "Documented limits of vision models (small text, rotation, spatial reasoning, wrong captions) and the statement that the model does not process file metadata; rules 18, 19 and 24"
  - title: "Anthropic — Vision"
    url: https://platform.claude.com/docs/en/build-with-claude/vision
    note: "Documented limits (approximate counts and positions, no reliable AI-generation detection, no naming people) and image-quality guidance, with the advice to always review image interpretations; rules 19, 20, 22 and 24"
  - title: "Li et al. 2023 — Evaluating Object Hallucination in Large Vision-Language Models"
    url: https://arxiv.org/abs/2305.10355
    note: "Vision-language models tend to describe objects that are not in the image; why descriptions are asked for narrowly and checked; rules 13 and 20"
  - title: "W3C WAI — Images Tutorial"
    url: https://www.w3.org/WAI/tutorials/images/
    note: "The text alternative to provide for each role of an image: informative, decorative, text, complex; rule 21"
  - title: "W3C — Web Content Accessibility Guidelines 2.2, Success Criterion 1.1.1"
    url: https://www.w3.org/TR/WCAG22/#non-text-content
    note: "Non-text content presented to users needs a text alternative; the requirement rule 21 implements"
  - title: "IPTC — Social media sites photo metadata test results 2019"
    url: https://iptc.org/standards/photo-metadata/social-media-sites-photo-metadata-test-results-2019/
    note: "Many sharing platforms remove embedded metadata from saved images, so values written into a file do not survive; rule 23"
  - title: "C2PA — Technical Specification 2.2"
    url: https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
    note: "A hard binding is a hash that proves an asset was not modified; any write to the file breaks it; rule 23"
  - title: "Anthropic — Choosing the right model"
    url: https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
    note: "Start with the fast, low-cost model, test on your own use case and upgrade only for a capability gap; rule 14 and the first-levels table"
  - title: "Anthropic — Effort"
    url: https://platform.claude.com/docs/en/build-with-claude/effort
    note: "Names classification and extraction as high-volume work for the small model; the effort column of the table"
  - title: "Tesseract OCR"
    url: https://github.com/tesseract-ocr/tesseract
    note: "An open source OCR engine that runs locally; rule 15"
  - title: "Ollama — Vision"
    url: https://docs.ollama.com/capabilities/vision
    note: "Local vision models can describe and classify images; the local option in rule 17 and the table"
  - title: "OWASP Gen AI Security Project — LLM02:2026 Sensitive Information Disclosure"
    url: https://genai.owasp.org/llm2026/llm022026-sensitive-information-disclosure/
    note: "Tool arguments, logs and derived output are disclosure surfaces for sensitive data; rule 16"
  - title: "Anthropic — Data residency"
    url: https://platform.claude.com/docs/en/manage-claude/data-residency
    note: "An external provider can be limited to an inference region with the inference_geo parameter; what an approved provider looks like in rule 16"
---
Enrichment adds a derived value to a record: a tag on an alert, the owner of an IP address, a summary of a ticket, a description of an image. The value comes from a lookup, a parser or a model. Enrichment is cheap to start and hard to stop. A pipeline that enriches every record at ingest, just in case, pays for values nobody reads, and every value it writes becomes something a later step trusts. A reputation lookup that timed out reads as a clean verdict. A description invents an object that is not in the image, then becomes the only record of it. Text hidden in an image or in a lookup result steers the agent that reads it.

These rules make each enrichment answer three questions before it runs: when, why and how. A derived value exists only for a named consumer and a named decision. It sits beside the source record, never over it, and carries where it came from. The cheapest method that can produce it goes first, at the lowest model level that holds, and the choice between local processing and an external provider is made per data class, in the gateway. Images have their own rules because a vision model reads pixels and nothing else, and tends to describe more than is there.

A record is anything an agent will later read or act on. A derived value is what enrichment adds to it. A consumer is the person, system or agent that reads that value. Local processing runs on systems your organisation controls; an external provider runs it on systems another organisation controls.

## Rules

### When to enrich

1. **MUST** name, for each derived value, the consumer that reads it and the decision or output it improves. Do not build a value that has no consumer.
2. **MUST** write down when each enrichment runs, with the counts behind the choice: at ingest when most records are read more than once or the consumer cannot wait; at use when most records are read rarely or the source facts change faster than the records do. Compare the record count times the cost per record with the read count times the cost per read before you choose.

### How to enrich

3. **MUST** use a parser, a hash, a lookup or a join before a model, and the model only for the values those cannot give ([BP-0064](/agent-engineering/workflow/use-decision-models-for-bounded-decisions/) rule 10).
4. **MUST** write each derived value in a separate field or file and leave the source record unchanged. A derived value that replaces a source field destroys the data it was derived from.
5. **MUST** record on each derived value its source or model, the model and prompt version, the time and the inputs, as [BP-0025](/knowledge-modelling/semantics-metadata/use-standard-metadata-vocabularies/) rule 3 requires, and mark each model-derived value unverified until a person or an independent check confirms it ([BP-0053](/multi-agent-systems/coordination-handoff/prevent-error-amplification/) rule 2). Let consumers filter on that mark.
6. **MUST** key each derived value by the content hash of its source record and the version of the enrichment. Rebuild it when either changes, and delete it when the record or its access is deleted ([BP-0027](/agent-engineering/context-memory/prepare-a-corpus-for-retrieval/) rule 6).
7. **MUST** define each derived value in a schema with a controlled vocabulary ([BP-0004](/knowledge-modelling/taxonomy/apply-a-taxonomy/)). When a result does not validate, leave the value empty; never guess one to fill the field.
8. **MUST** give each enrichment step no tools beyond its input data and its output fields, and treat everything it reads as data, never as instructions ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)): lookup results, pages, embedded metadata, OCR text and model descriptions can all carry them.
9. **MUST** send an external service a hash or an identifier before the content, and only the fields the task needs ([BP-0067](/security-safety/data-sovereignty-privacy/keep-agent-data-where-it-is-allowed/) rule 7).
10. **MUST** give each derived value the stricter of two access labels, that of the source record and that of the enrichment source, so a join cannot move a restricted fact onto a record with a wider audience ([BP-0027](/agent-engineering/context-memory/prepare-a-corpus-for-retrieval/) rule 2, [BP-0031](/knowledge-modelling/knowledge-graphs/build-agent-knowledge-graphs/) rule 13).
11. **MUST** record a failed or empty enrichment as unknown, never as a negative result: a reputation lookup that timed out is not a clean verdict. Log each failure with its cause.
12. **MUST** record when each external fact was observed and give each external source a validity period. Show a value past that period as stale ([BP-0031](/knowledge-modelling/knowledge-graphs/build-agent-knowledge-graphs/) rule 9).
13. **MUST** measure each model-derived value on a labelled sample of your own records before release and after each model or prompt change ([BP-0006](/operations/evaluation/evaluate-agent-output/), [BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/) rule 2).

### Model levels and where to run

14. **MUST** give each model-derived value a first model level and effort from the table below, starting at the lowest level that can produce it. Prove the level on the labelled sample of rule 13 and move up one level only when the sample shows a capability gap ([BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/) rules 4 and 7).
15. **MUST** run each step that needs no model on your own systems: a metadata parser, a hash tool or a local OCR engine.
16. **MUST** select local processing or an external provider for each record from its data class, record the selection and enforce it in the gateway, not in an instruction ([BP-0067](/security-safety/data-sovereignty-privacy/keep-agent-data-where-it-is-allowed/) rules 3 and 4, [BP-0046](/operations/model-gateways-routing/route-model-traffic-through-a-gateway/) rule 6). If no provider is approved for that class, use a local model or leave the value empty.
17. **SHOULD** prefer local processing when it meets the field's quality bar, after comparing it with an external provider on quality, cost per 1,000 records and latency ([BP-0041](/operations/cost-performance/budget-and-control-agent-cost/)).

### Images

18. **MUST** read the metadata embedded in an image file (EXIF, XMP, IPTC, C2PA) with a metadata parser and ask the model only about the pixels. Vision models do not read a file's metadata.
19. **MUST NOT** ask a vision model for what its documentation says it cannot do: naming people, exact counts, telling whether an image is AI-generated. Treat the counts and positions it returns as approximate.
20. **MUST** ask the model only the questions the consumer needs, and have it return each text passage and each object it claims with a bounding box, so a person or a script can check the description against the image. An open "describe everything" invites objects that are not there.
21. **MUST** set a text alternative from the image's role: a short description for an informative image, no text for a decorative one, the same words for an image of text, and a full text equivalent for a chart or diagram.
22. **SHOULD** have a person check a generated text alternative before it is published, and keep it a draft until then.
23. **MUST NOT** write a derived value into the original image file. Keep derived values beside it, keyed by the file's hash: any write changes the bytes, so the hash and any C2PA hard binding no longer match, and many sharing platforms strip embedded metadata anyway. If a workflow needs embedded metadata, write it into a derived copy.
24. **SHOULD** give the model a legible image: pre-resize large images, crop the region with small text, avoid repeated compression, and record the crop and scale used.

## First levels by value

The table gives a first level, not a result. The labelled sample of rule 13 makes the final choice, and [BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/) names the models of each level for each provider and dates them. For local processing, use an open-weight model of the same level. For an image, use a vision model at that level. Rule 16 decides where each row runs.

| Derived value | First level | Effort |
| --- | --- | --- |
| Embedded metadata, hash, text from clear scans | No model | Not applicable |
| Tags, classes, short text extraction, simple image description | Small, fast model | Low |
| Summaries, entities in context, text from tables, longer image descriptions | Mid model | Low or medium |
| Ambiguous cases, charts, diagrams, dense documents, text alternatives for publication | Capable model, or a person | Medium or high |

## When to apply

Apply this when an agent or a pipeline adds a field to a record that the record did not carry: classifying or tagging alerts, tickets and documents; joining a record to an inventory or a reputation service; summarising; extracting entities; describing images and writing text alternatives. It applies whether the enrichment runs as a batch at ingest, as a lookup at use, or as one step inside an agent's own work.

It matters most where a derived value will be trusted without being read again: a triage queue, a search index, a dashboard, a published page.

The practices cited in the rules still govern their own ground. This page applies their provenance, untrusted-content, access-label, cost and model-level rules to enrichment; it does not replace them. Enriching indicators for a threat-intelligence product also follows [BP-0082](/security-safety/ai-enabled-cyber-defence/run-a-validated-threat-intelligence-cycle/).

## Procedure

1. List the fields the consumer needs, with the decision each one improves. Drop the rest.
2. For each field, try the cheapest method first: a parser, a hash, a lookup, a join. Use a model only for what they cannot give.
3. Write the schema of each derived value, with its vocabulary and an `unknown` value.
4. Decide when each enrichment runs, at ingest or at use, from the record count and the read count.
5. Classify the record's data and select local processing or an approved provider for each field. Put the route in the gateway.
6. Store derived values beside the source record, keyed by its content hash and the enrichment version.
7. Label a sample of your own records, then measure each model-derived field at the lowest level in the table. Move up one level only on a measured gap.
8. Run the sample again after each model or prompt change, and watch the share of empty values and failures in production.
9. Rebuild or delete derived values when the record, its access or the enrichment version changes.

## Examples

- **A description beside an image.** The derived value is a separate record keyed by the file's hash. It carries the evidence the model used, so a person or a script can check it against the image:

  ```json
  {
    "image_sha256": "9f2c7d…e1b4",
    "field": "description",
    "value": "A line chart of battery charge against hour of day, peaking at 14:00.",
    "evidence": [
      { "text": "Battery charge (kWh)", "box": [40, 18, 212, 34] },
      { "object": "line chart", "box": [0, 0, 800, 480] }
    ],
    "producer": { "kind": "model", "model": "<model id and version>", "prompt": "describe-chart@3", "effort": "medium" },
    "input": "full image, resized to 800 px wide",
    "generated": "2026-11-27T08:12:00Z",
    "enrichment_version": "image-describe@2",
    "status": "unverified"
  }
  ```

  The W3C Web Annotation Data Model expresses the same shape (target, body, generator, generated) when annotations must be shared between systems.

- **A failed lookup is unknown, not clean.** The service receives a hash, not the file, and a failure never becomes a verdict:

  ```ts
  type Verdict = 'malicious' | 'suspicious' | 'clean' | 'unknown';

  async function reputationOf(file: Buffer): Promise<Verdict> {
    try {
      // A hash, not the file: the service learns nothing about the content.
      const res = await reputation.lookup(sha256(file));
      return VERDICTS.has(res.verdict) ? res.verdict : 'unknown';
    } catch (err) {
      log.warn('enrichment failed', { field: 'reputation', cause: err });
      return 'unknown'; // A failed lookup is not a clean verdict.
    }
  }
  ```

- **Where each field may run.** The route is data in the gateway, keyed by data class. Anything not listed is denied:

  ```yaml
  routes:
    - data_class: [public, internal]
      fields: [tag, summary, description]
      allow: [local_small, external_provider_a]
    - data_class: [confidential, personal]
      fields: [tag, summary, description]
      allow: [local_small, local_mid] # no external provider is approved
  ```

- **Text alternatives by role.** An informative chart gets a short description and points to the data. A decorative rule gets an empty alternative, so a screen reader skips it:

  ```html
  <img src="charge.png"
       alt="Battery charge against hour of day, peaking at 14:00. Full data in the table below.">
  <img src="rule.svg" alt="">
  ```

  If a derived copy of an image must carry its own alternative, write it to the IPTC Alt Text (Accessibility) property.

## Anti-patterns

- Enriching every record at ingest "just in case", with no named reader for the result.
- A derived value overwriting the source field, so nobody can rebuild it or tell which was which.
- Treating an empty or failed lookup as a clean result, and closing the alert.
- Asking a vision model to "describe everything", then publishing the answer as alt text with no check.
- Asking a vision model whether an image is AI-generated, or to count a crowd exactly.
- Writing descriptions into the original image file, which changes its hash and breaks any C2PA binding.
- Sending whole documents to a classification service when a hash or an identifier would do.
- Using the most capable model for tagging, with no measurement of whether a smaller one holds.
- Sending personal or confidential records to whichever provider is easiest to sign up with.
- Letting the enrichment step keep its tools, so text in a record can make it act.

## Checklist

- [ ] Each derived value names its consumer and the decision it improves
- [ ] When each enrichment runs is written down, with the record and read counts
- [ ] A parser, hash, lookup or join is tried before a model
- [ ] Derived values sit beside the source record, which stays unchanged
- [ ] Each derived value carries its provenance and its verification mark
- [ ] Derived values are keyed by content hash and enrichment version, and rebuilt or deleted on change
- [ ] Each derived value has a schema; an invalid result leaves it empty
- [ ] The enrichment step has no tools and treats everything it reads as data
- [ ] External services receive a hash or identifier and only the fields they need
- [ ] Each derived value carries the stricter of its two access labels
- [ ] A failed or empty enrichment is recorded as unknown and logged
- [ ] External facts carry an observation time and a validity period
- [ ] Each model-derived value is measured on a labelled sample, before release and after each change
- [ ] Each model-derived value starts at the lowest level in the table
- [ ] Steps that need no model run on your own systems
- [ ] Local or external processing is selected per data class and enforced in the gateway
- [ ] Embedded image metadata is read by a parser, not a model
- [ ] The vision model is asked only for what its documentation says it can do
- [ ] Descriptions quote their evidence with bounding boxes
- [ ] Text alternatives follow the role of the image
- [ ] No derived value is written into the original image file
