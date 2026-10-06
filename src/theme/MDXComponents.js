import MDXComponents from '@theme-original/MDXComponents';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Variant, VariantGroup, GuideEnv } from '@site/src/components/guide';
import { TabSync } from '@site/src/components/guide/variantStore';

/**
 * Components available to every MDX page without imports. Published guide
 * pages (synced from llm-d/llm-d guides/) rely on these: preprocess.mjs turns
 * their GitHub-friendly <details> markers into Tabs/Variant groups.
 */
export default {
  ...MDXComponents,
  Tabs,
  TabItem,
  Variant,
  VariantGroup,
  GuideEnv,
  TabSync,
};
