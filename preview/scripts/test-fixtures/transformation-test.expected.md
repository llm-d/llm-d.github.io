import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Transformation Test Document

This document contains examples of all markdown transformations that should occur during the sync process.

## 1. GitHub Callouts Test

:::note
This is a note callout that should transform to `:::note`.
:::


:::tip
This is a tip callout that should transform to `:::tip`.
:::


:::important
This is an important callout that should transform to `:::important`.
:::


:::warning
This is a warning callout that should transform to `:::warning`.
:::


:::caution
This is a caution callout that should transform to `:::caution`.
:::


## 2. Multi-line Callout Test

:::note
This is a multi-line note callout.
It spans multiple lines.
All lines should be included in the transformation.
:::


## 3. Custom Tabs Test


<Tabs>

<TabItem value="first-tab" label="First Tab" default>
### First Tab Content

This is the content of the first tab.
It should be marked as default.

```bash
echo "First tab code block"
```

</TabItem>
<TabItem value="second-tab" label="Second Tab">
### Second Tab Content

This is the content of the second tab.

- List item 1
- List item 2
- List item 3

</TabItem>
<TabItem value="third-tab-complex-name" label="Third Tab (Complex Name)">
### Third Tab with Complex Name

This tab has parentheses and spaces in the label.
The value should be `third-tab-complex-name`.

</TabItem>
</Tabs>


## 4. Nested Content in Tabs Test


<Tabs>

<TabItem value="aws-eks" label="AWS EKS" default>
#### Deploy on AWS

```yaml
apiVersion: v1
kind: Service
metadata:
  name: test-service
```

See [documentation](./link.md) for more details.

:::note
This note is inside a tab!
:::


</TabItem>
<TabItem value="google-gke" label="Google GKE">
#### Deploy on GKE

```bash
gcloud container clusters create my-cluster
```

</TabItem>
</Tabs>


## 5. Image Path Test

Images with relative paths should be transformed:

![Test Image](/img/docs/test-image.svg)
![Another Image](/img/docs/nested/another-image.png)

## 6. MDX Escape Test

This should escape arrows: \<->

## 7. HTML Image Tag Test

Images with unquoted attributes should be quoted for MDX:

<p align="center">
  <img alt="Test" src="/docs/img/docs/test.svg" width="95%" />
</p>

<img src="/docs/img/docs/another.png" height="200" />

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" />
    <img alt="Test Arch" src="/docs/img/docs/arch.svg" width="90%" />
  </picture>
</p>

## 8. HTML Comment Test

{/* This is a regular HTML comment that should be converted to MDX */}

Some text here.

{/* Another comment with special chars: <, >, &, etc. */}

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


<Tabs>

<TabItem value="empty-tab" label="Empty Tab" default>

</TabItem>
</Tabs>


### Single Tab


<Tabs>

<TabItem value="only-tab" label="Only Tab" default>
This is the only tab.

</TabItem>
</Tabs>


### Tab with Special Characters


<Tabs>

<TabItem value="gke-h100-h200" label="GKE (H100/H200)" default>
Content for H100/H200 GPUs.

</TabItem>
<TabItem value="coreweave-us-east" label="CoreWeave @ US-East">
Content with @ symbol.

</TabItem>
</Tabs>

