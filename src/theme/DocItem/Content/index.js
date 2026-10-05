import React from 'react';
import Content from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { GuideProvider } from '@site/src/components/guide/variantStore';
import { RunBanner, VariantSelector } from '@site/src/components/guide';

/**
 * Published guide pages (frontmatter `llmd_guide`, injected by `llmd-site
 * sync`) get a "Run this guide" banner and the accelerator × engine selector
 * above the content; the provider also scopes <Variant>/<GuideEnv> state.
 */
export default function ContentWrapper(props) {
  const { frontMatter } = useDoc();
  const meta = frontMatter?.llmd_guide;
  if (!meta) return <Content {...props} />;
  return (
    <GuideProvider meta={meta}>
      <RunBanner meta={meta} />
      <VariantSelector />
      <Content {...props} />
    </GuideProvider>
  );
}
