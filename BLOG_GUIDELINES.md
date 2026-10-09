# llm-d Blog Guidelines

Guidance for writing and reviewing llm-d blog posts. It defines the llm-d blog
style and how to align tone and messaging with previous posts. It also defines
how a post moves from draft to publish.

For the mechanics of editing, previewing, and opening a PR, see
[CONTRIBUTING.md](./CONTRIBUTING.md#editing-local-content). This document is
about *what makes a good llm-d post*, not how to submit one.

> Release announcements (`vN.M` posts) are authored and owned by the
> maintainers and follow their own rhythm. This guide is for everything else:
> deep dives, benchmarks, integrations, and community updates.

---

## Who does what

Posts move through two stages:

1. **Content team triage.** First-pass review. Confirms the post fits the
   house style, is technically coherent, is neutral toward hardware/vendors,
   and is structurally complete (see the checklist below). The content team
   can request changes directly and iterate with the author.
2. **Maintainer final review.** Sign-off. Maintainers own anything that
   touches project positioning, competitive/partner sensitivity, roadmap
   claims, or performance numbers that will be quoted externally. A post ships
   only after a maintainer approves.

If the content team is unsure whether something is sensitive, escalate to a
maintainer rather than guessing. Sensitivity questions are a maintainer call.

---

## What we publish

| Type | Purpose | Typical length |
|------|---------|----------------|
| **Community / update** | Roundups, event recaps, project news | 250–550 words |
| **Deep dive / architecture** | How a subsystem works and why | 1,900–3,800 words |
| **Benchmark / results** | Measured outcomes with methodology | 1,400–5,500 words |
| **Integration / walkthrough** | Using llm-d with another system | 1,500–3,000 words |

If a draft is far outside these ranges, that is a signal to re-scope, not a
hard rule.

---

## House style

These are the conventions that hold across the existing posts. Follow them
unless there is a good reason not to, and say why in the PR if you deviate.

### Framing and voice

- **Lead with a problem, never a feature list.** Open with a concrete pain a
  reader recognizes ("route to the owner and it queues, route elsewhere and it
  recomputes"), then show how llm-d addresses it. Feature enumerations do not
  open posts.
- **Use the collective "we"** for the project, and name the audience
  explicitly ("operators," "developers," "platform teams").
- **Confident but measured.** State what the system does plainly. Avoid
  superlatives and marketing adjectives.
- **Quantify enthusiasm; don't assert it.** "57x faster on this workload"
  carries the point; "blazing fast" does not. Every strong claim should be
  backed by a number, a link, or a figure.
- **Hedge honestly.** Name the limits of a result in the post itself ("this is
  not a universal speedup," "measured on a single node"). Readers trust posts
  that state their own boundaries.

### Neutrality (this is where posts get held up)

- **Be hardware- and vendor-agnostic.** llm-d runs on any model, any
  accelerator, any cloud. List hardware in neutral terms; do not rank vendors.
- **Don't compare accelerator vendors directly.** When a post spans multiple
  vendors, anonymize (the three-vendor sovereign-cluster post uses "Vendor
  A/B/C") unless every named party has agreed to be named.
- **Scope every benchmark explicitly.** Use an admonition up top stating what
  the numbers are and are not. Model to follow (from the Kimi-VL post):
  > `:::note Benchmark scope`
  > This is not a general comparison of accelerator platforms. Cost figures are
  > an illustrative sensitivity check, not a TCO estimate.
  > `:::`
- **Baselines are internal.** Compare against round-robin, random, or a prior
  llm-d version, not against a named competitor product.
- **Credit upstream generously.** llm-d is "a control plane that wraps
  inference engines, not a distribution that replaces them." Credit and link
  vLLM, the Gateway API, Kubernetes, NIXL, LMCache, and any project you build
  on. Flag contributions you upstreamed.
- **Mention competitors factually or not at all.** Never disparage.

### Structure

- **Truncation marker.** Put `<!-- truncate -->` after a 2–4 paragraph intro.
  Everything above it is the blog-index teaser, so make it stand alone.
- **Sentence-case headers that carry the takeaway.** Prefer "Prefill and
  decode scale independently" over "Scaling."
- **Open each major section with a bold thesis sentence**, then support it.
- **Prose-dominant.** Use bullets for enumerations, not as the primary mode.
- **Use Docusaurus admonitions** (`:::note`, `:::tip`, `:::warning`,
  `:::info`) for asides, caveats, and scope notes.
- **Tables for results**, with the winning cell **bolded**. Put benchmark
  setup in a `<details>` block so it is available but not in the way.
- **Caption figures** as `*Figure N: description*`.
- **Close with two things:** a short "What's Next" pointing at the roadmap,
  then the standard community block (Slack via `/slack`, GitHub, the Wednesday
  12:30pm ET call, social). Sign off with "Come build with us."

### Terminology

- **"well-lit path"** is the canonical term for a tested, documented, supported
  deployment pattern. Use it precisely; don't apply it to experimental work.
- **Name components exactly and in backticks**: `EPP`, `InferencePool`,
  `NixlConnector`, `token-load-scorer`. Match the names used in the docs.
- **Prefer the terms the docs use.** If a term is contested internally, raise
  it with a maintainer before coining new usage in a post.

### Frontmatter

```yaml
---
title: "Your title (quote it if it contains a colon)"
description: One dense sentence with the headline result or number.
slug: kebab-case-slug
date: 2026-09-03T09:00
authors: [your-github-handle]
tags: [blog, <topic>]
---
```

- **description** is the teaser and social preview; make it specific and lead
  with the strongest concrete fact.
- **authors** are real GitHub handles for deep dives and benchmarks. Add
  yourself to `blog/authors.yml` if you are not there.
- **tags** for non-release posts are `[blog, <topic>]`. Reuse existing tags
  from `blog/tags.yml` where they fit.
- Use `.mdx` if the post uses JSX/components; `.md` otherwise.
- No emoji in prose.

---

## Review checklist

Content team runs this on first pass; maintainers confirm the flagged items.

**Framing**
- [ ] Opens with a problem, not a feature list
- [ ] Claims are quantified or linked; no unbacked superlatives
- [ ] Limits of the result are stated honestly

**Neutrality** (maintainer confirms)
- [ ] Hardware/vendor-neutral; no direct vendor-vs-vendor comparison
- [ ] Every benchmark has an explicit scope note
- [ ] Baselines are internal, not named competitors
- [ ] Upstream projects credited and linked
- [ ] No competitive/partner-sensitive claims without maintainer sign-off

**Structure**
- [ ] `<!-- truncate -->` present after a self-contained intro
- [ ] Section headers carry the takeaway; sections open with a thesis
- [ ] Results in tables with winning cell bolded; setup in `<details>`
- [ ] Figures captioned
- [ ] Closes with "What's Next" + standard community block

**Terminology & frontmatter**
- [ ] "well-lit path" and component names used correctly and in backticks
- [ ] Frontmatter complete (title, description, slug, date, authors, tags)
- [ ] Author is in `blog/authors.yml`; tags exist in `blog/tags.yml`
- [ ] Builds locally (`npm start`) with no broken links or images

**Positioning** (maintainer)
- [ ] Roadmap/forward-looking claims are accurate and approved
- [ ] Externally quotable numbers are approved for external use
