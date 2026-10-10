package sync

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

func TestSyncLWS(t *testing.T) {
	// Create temporary fixture for LWS repo
	lwsDir := t.TempDir()
	t.Setenv("LWS_REPO", lwsDir)

	// Create directory structure:
	// site/content/en/docs/concepts/leaderworkerset/
	// site/content/en/docs/concepts/disaggregatedset/
	// site/content/en/docs/reference/
	// site/static/examples/
	// site/static/images/
	conceptsDir := filepath.Join(lwsDir, "site", "content", "en", "docs", "concepts")
	lwsDirConcepts := filepath.Join(conceptsDir, "leaderworkerset")
	dsDirConcepts := filepath.Join(conceptsDir, "disaggregatedset")
	refDir := filepath.Join(lwsDir, "site", "content", "en", "docs", "reference")
	staticDir := filepath.Join(lwsDir, "site", "static")
	examplesDir := filepath.Join(staticDir, "examples")
	imagesDir := filepath.Join(staticDir, "images")

	for _, d := range []string{
		filepath.Join(lwsDirConcepts, "subpage-b"),
		filepath.Join(lwsDirConcepts, "subpage-a"),
		filepath.Join(dsDirConcepts, "role"),
		refDir,
		examplesDir,
		imagesDir,
	} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	// 1. Static files
	if err := os.WriteFile(filepath.Join(examplesDir, "sample.yaml"), []byte("sampleKey: sampleValue\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(imagesDir, "lws-concept.svg"), []byte("<svg>lws</svg>"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(imagesDir, "ds-concept.svg"), []byte("<svg>ds</svg>"), 0o644); err != nil {
		t.Fatal(err)
	}

	// 2. Concepts root _index.md
	conceptsRootContent := `---
title: "Concepts"
weight: 1
---

## Architecture: Two Complementary APIs

Both APIs complement each other.

## Comparison Matrix

Matrix details.

## When to Use Which API

Usage guidelines.
`
	if err := os.WriteFile(filepath.Join(conceptsDir, "_index.md"), []byte(conceptsRootContent), 0o644); err != nil {
		t.Fatal(err)
	}

	// 3. LeaderWorkerSet root _index.md
	lwsRootContent := `---
title: "LeaderWorkerSet"
linkTitle: "LeaderWorkerSet"
weight: 10
---

**LeaderWorkerSet (LWS)** is an API for distributed AI.

<p align="center">
  <img src="/images/lws-concept.svg" width="550" alt="LWS Concept">
</p>

## Architecture and Relationship with StatefulSet

LWS composes StatefulSets.

[Link to subpage A](subpage-a/)
[Link to DisaggregatedSet](../../disaggregatedset/)
`
	if err := os.WriteFile(filepath.Join(lwsDirConcepts, "_index.md"), []byte(lwsRootContent), 0o644); err != nil {
		t.Fatal(err)
	}

	// 4. Subpage A (Weight 10) - has includes, alerts, headings, links, images
	subpageAContent := `---
title: "Subpage One"
linkTitle: "Subpage One"
weight: 10
---

This is subpage one.

{{% alert title="Warning" color="warning" %}}
Be careful with configuration!
{{% /alert %}}

{{< include file="examples/sample.yaml" lang="yaml" >}}

## Inner Section

Inner content.

### Deeper Section
` + "\n```yaml\n# A comment inside code block\nkey: val\n```\n" + `
[Cross-link to B](../subpage-b/)
[Link to root](../)
[External Example Link](../../../examples/leaderworkerset/gang-scheduling/#inspect-the-scheduling-objects)
![Diagram](/images/ds-concept.svg)
`
	if err := os.WriteFile(filepath.Join(lwsDirConcepts, "subpage-a", "_index.md"), []byte(subpageAContent), 0o644); err != nil {
		t.Fatal(err)
	}

	// 5. Subpage B (Weight 20)
	subpageBContent := `---
title: "Subpage Two"
linkTitle: "Subpage Two"
weight: 20
---

This is subpage two.

## Section B

Section B content.
`
	if err := os.WriteFile(filepath.Join(lwsDirConcepts, "subpage-b", "_index.md"), []byte(subpageBContent), 0o644); err != nil {
		t.Fatal(err)
	}

	// 6. DisaggregatedSet root _index.md
	dsRootContent := `---
title: "DisaggregatedSet"
weight: 30
---

**DisaggregatedSet** orchestrates multiple LWS.

![DS](/images/ds-concept.svg)

## Relationship to LeaderWorkerSet

Orchestrates LWS.

## Key Design Principles

Declarative and coordinated.

[Link to LWS](../../leaderworkerset/)
`
	if err := os.WriteFile(filepath.Join(dsDirConcepts, "_index.md"), []byte(dsRootContent), 0o644); err != nil {
		t.Fatal(err)
	}

	// 7. DS child subpage
	dsRoleContent := `---
title: "Roles in DisaggregatedSet"
weight: 10
---

Prefill and decode roles.

## Role Configurations

Details on roles.
`
	if err := os.WriteFile(filepath.Join(dsDirConcepts, "role", "_index.md"), []byte(dsRoleContent), 0o644); err != nil {
		t.Fatal(err)
	}

	// 8. Reference labels file
	refContent := `---
title: "Labels"
---

# Labels

| Key | Description |
| --- | --- |
| foo | bar |

# Annotations

| Key | Description |
| --- | --- |
| ann | val |

# Environment Variables

| Key | Description |
| --- | --- |
| env | val |
`
	if err := os.WriteFile(filepath.Join(refDir, "labels-annotations-and-environment-variables.md"), []byte(refContent), 0o644); err != nil {
		t.Fatal(err)
	}

	// Now set up target docs directory
	targetRepo := t.TempDir()
	docsDir := filepath.Join(targetRepo, "docs")
	servingDir := filepath.Join(docsDir, "architecture", "model-server-orchestration")
	if err := os.MkdirAll(servingDir, 0o755); err != nil {
		t.Fatal(err)
	}

	m := manifest.Default()
	m.Sources.LWS = manifest.SourceRepo{
		Remote: manifest.RemoteSource{
			URL:           "https://github.com/kubernetes-sigs/lws",
			DefaultBranch: "main",
			DocsRoot:      "site",
		},
	}

	eng := &engine{
		m:       m,
		docsDir: docsDir,
		opts:    Options{RepoRoot: targetRepo},
	}

	if err := eng.syncLWS(); err != nil {
		t.Fatalf("syncLWS failed: %v", err)
	}

	// Verify leaderworkerset.md
	lwsPath := filepath.Join(servingDir, "leaderworkerset.md")
	lwsBytes, err := os.ReadFile(lwsPath)
	if err != nil {
		t.Fatalf("read leaderworkerset.md: %v", err)
	}
	lwsDoc := string(lwsBytes)

	// Verify frontmatter & title
	if !strings.Contains(lwsDoc, "title: LeaderWorkerSet (LWS)") {
		t.Errorf("expected title in frontmatter")
	}
	if !strings.Contains(lwsDoc, "# LeaderWorkerSet (LWS)") {
		t.Errorf("expected # LeaderWorkerSet (LWS)")
	}

	// Verify alert conversion
	if !strings.Contains(lwsDoc, "> [!WARNING]") || !strings.Contains(lwsDoc, "> Be careful with configuration!") {
		t.Errorf("alert conversion failed, got:\n%s", lwsDoc)
	}

	// Verify include inlining
	expectedInclude := "```yaml\nsampleKey: sampleValue\n```"
	if !strings.Contains(lwsDoc, expectedInclude) {
		t.Errorf("include inlining failed, expected %q", expectedInclude)
	}

	// Verify weight ordering: "## Subpage One" (weight 10) must appear before "## Subpage Two" (weight 20)
	idxOne := strings.Index(lwsDoc, "## Subpage One")
	idxTwo := strings.Index(lwsDoc, "## Subpage Two")
	if idxOne == -1 || idxTwo == -1 {
		t.Fatalf("subpages not found in leaderworkerset.md: idxOne=%d, idxTwo=%d", idxOne, idxTwo)
	}
	if idxOne >= idxTwo {
		t.Errorf("weight ordering failed: Subpage One (idx=%d) should precede Subpage Two (idx=%d)", idxOne, idxTwo)
	}

	// Verify heading demotion
	if !strings.Contains(lwsDoc, "### Inner Section") {
		t.Errorf("heading ## Inner Section was not shifted to ### Inner Section")
	}
	if !strings.Contains(lwsDoc, "#### Deeper Section") {
		t.Errorf("heading ### Deeper Section was not shifted to #### Deeper Section")
	}
	// Verify code block comments were NOT shifted
	if !strings.Contains(lwsDoc, "# A comment inside code block") {
		t.Errorf("comment inside code block was modified")
	}

	// Verify link rewriting
	if !strings.Contains(lwsDoc, "[Cross-link to B](#subpage-two)") {
		t.Errorf("link to subpage-b was not rewritten to #subpage-two, got doc snippet around it")
	}
	if !strings.Contains(lwsDoc, "[Link to subpage A](#subpage-one)") {
		t.Errorf("link to subpage-a was not rewritten to #subpage-one")
	}
	if !strings.Contains(lwsDoc, "[Link to DisaggregatedSet](disaggregatedset.md)") {
		t.Errorf("cross-link to disaggregatedset was not rewritten to disaggregatedset.md")
	}
	if !strings.Contains(lwsDoc, "[External Example Link](https://lws.sigs.k8s.io/docs/examples/leaderworkerset/gang-scheduling/#inspect-the-scheduling-objects)") {
		t.Errorf("external example link was not rewritten to https://lws.sigs.k8s.io/docs/..., got doc snippet")
	}

	// Verify image rewriting
	if !strings.Contains(lwsDoc, `src="../../assets/lws/lws-concept.svg"`) {
		t.Errorf("HTML image src /images/lws-concept.svg not rewritten to ../../assets/lws/lws-concept.svg")
	}
	if !strings.Contains(lwsDoc, `![Diagram](../../assets/lws/ds-concept.svg)`) {
		t.Errorf("Markdown image /images/ds-concept.svg not rewritten to ../../assets/lws/ds-concept.svg")
	}

	// Verify labels reference transformed
	if !strings.Contains(lwsDoc, "## Labels, Annotations and Environment Variables") {
		t.Errorf("labels heading missing")
	}
	if !strings.Contains(lwsDoc, "### Labels") || !strings.Contains(lwsDoc, "### Annotations") || !strings.Contains(lwsDoc, "### Environment Variables") {
		t.Errorf("labels reference subheadings not shifted to ###")
	}

	// Verify disaggregatedset.md
	dsPath := filepath.Join(servingDir, "disaggregatedset.md")
	dsBytes, err := os.ReadFile(dsPath)
	if err != nil {
		t.Fatalf("read disaggregatedset.md: %v", err)
	}
	dsDoc := string(dsBytes)

	if !strings.Contains(dsDoc, "title: DisaggregatedSet") {
		t.Errorf("expected title in disaggregatedset frontmatter")
	}
	if !strings.Contains(dsDoc, "## Architecture: Two Complementary APIs") {
		t.Errorf("expected concepts/_index.md Architecture section in disaggregatedset.md")
	}
	if !strings.Contains(dsDoc, "## Comparison Matrix") {
		t.Errorf("expected concepts/_index.md Comparison Matrix in disaggregatedset.md")
	}
	if !strings.Contains(dsDoc, "## Roles in DisaggregatedSet") {
		t.Errorf("expected child subpage Roles in DisaggregatedSet in disaggregatedset.md")
	}
	if !strings.Contains(dsDoc, "[Link to LWS](leaderworkerset.md)") {
		t.Errorf("expected cross-link to LWS rewritten to leaderworkerset.md")
	}

	// Verify assets copied
	if _, err := os.Stat(filepath.Join(docsDir, "assets", "lws", "lws-concept.svg")); err != nil {
		t.Errorf("expected lws-concept.svg copied to docs/assets/lws/: %v", err)
	}
	if _, err := os.Stat(filepath.Join(docsDir, "assets", "lws", "ds-concept.svg")); err != nil {
		t.Errorf("expected ds-concept.svg copied to docs/assets/lws/: %v", err)
	}
}
