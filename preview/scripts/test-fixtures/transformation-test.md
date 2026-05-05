# Transformation Test Document

This document contains examples of all markdown transformations that should occur during the sync process.

## 1. GitHub Callouts Test

> [!NOTE]
> This is a note callout that should transform to `:::note`.

> [!TIP]
> This is a tip callout that should transform to `:::tip`.

> [!IMPORTANT]
> This is an important callout that should transform to `:::important`.

> [!WARNING]
> This is a warning callout that should transform to `:::warning`.

> [!CAUTION]
> This is a caution callout that should transform to `:::caution`.

## 2. Multi-line Callout Test

> [!NOTE]
> This is a multi-line note callout.
> It spans multiple lines.
> All lines should be included in the transformation.

## 3. Custom Tabs Test

<!-- TABS:START -->

<!-- TAB:First Tab:default -->
### First Tab Content

This is the content of the first tab.
It should be marked as default.

```bash
echo "First tab code block"
```

<!-- TAB:Second Tab -->
### Second Tab Content

This is the content of the second tab.

- List item 1
- List item 2
- List item 3

<!-- TAB:Third Tab (Complex Name) -->
### Third Tab with Complex Name

This tab has parentheses and spaces in the label.
The value should be `third-tab-complex-name`.

<!-- TABS:END -->

## 4. Nested Content in Tabs Test

<!-- TABS:START -->

<!-- TAB:AWS EKS:default -->
#### Deploy on AWS

```yaml
apiVersion: v1
kind: Service
metadata:
  name: test-service
```

See [documentation](./link.md) for more details.

> [!NOTE]
> This note is inside a tab!

<!-- TAB:Google GKE -->
#### Deploy on GKE

```bash
gcloud container clusters create my-cluster
```

<!-- TABS:END -->

## 5. Image Path Test

Images with relative paths should be transformed:

![Test Image](../assets/test-image.svg)
![Another Image](../../assets/nested/another-image.png)

## 6. MDX Escape Test

This should escape arrows: <->

## 7. HTML Image Tag Test

Images with unquoted attributes should be quoted for MDX:

<p align="center">
  <img alt="Test" src="../assets/test.svg" width=95%>
</p>

<img src="../assets/another.png" height=200>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)">
    <img alt="Test Arch" src="../assets/arch.svg" width=90%>
  </picture>
</p>

## 8. HTML Comment Test

<!-- This is a regular HTML comment that should be converted to MDX -->

Some text here.

<!-- Another comment with special chars: <, >, &, etc. -->

## 9. Regular Markdown Test

This section tests that regular markdown is NOT transformed:

**Bold text** should remain bold.

*Italic text* should remain italic.

- Unordered lists
- Should work fine

1. Ordered lists
2. Should also work

```javascript
// Code blocks should not be touched
const test = "value";
```

## 9. Edge Cases

### Empty Tab

<!-- TABS:START -->

<!-- TAB:Empty Tab:default -->

<!-- TABS:END -->

### Single Tab

<!-- TABS:START -->

<!-- TAB:Only Tab:default -->
This is the only tab.

<!-- TABS:END -->

### Tab with Special Characters

<!-- TABS:START -->

<!-- TAB:GKE (H100/H200):default -->
Content for H100/H200 GPUs.

<!-- TAB:CoreWeave @ US-East -->
Content with @ symbol.

<!-- TABS:END -->
