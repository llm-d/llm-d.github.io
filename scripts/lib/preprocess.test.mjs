// Run with: node --test scripts/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeDocsPreprocessor, guideToMdx, mdxSafeLine } from './preprocess.mjs';

function setup() {
  const docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-'));
  const write = (rel, s = '# x\n') => {
    fs.mkdirSync(path.dirname(path.join(docsDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(docsDir, rel), s);
  };
  write('architecture/README.md');
  write('infrastructure/gateway/README.md');
  write('well-lit-paths/foundations/demo/index.mdx');
  write('well-lit-paths/foundations/demo/benchmark-run1.md');
  write('operations/x.md');
  fs.writeFileSync(
    path.join(docsDir, '.sync-map.json'),
    JSON.stringify({
      ref: 'release-0.9',
      repo: 'https://github.com/llm-d/llm-d',
      pages: {
        'well-lit-paths/foundations/demo/index.mdx': 'guides/demo/README.md',
        'well-lit-paths/foundations/demo/benchmark-run1.md': 'guides/demo/bench/run1/README.md',
      },
      guides: { 'guides/demo': { docs: 'well-lit-paths/foundations/demo', img: '/img/docs/guides/demo' } },
    }),
  );
  const pp = makeDocsPreprocessor({ docsDir });
  const run = (rel, fileContent) => pp({ filePath: path.join(docsDir, rel), fileContent });
  return { docsDir, run };
}

const GH = 'https://github.com/llm-d/llm-d';

test('guide page links resolve against original repo location', () => {
  const { run } = setup();
  const out = run(
    'well-lit-paths/foundations/demo/index.mdx',
    [
      '---',
      'title: "Demo"',
      'llmd_guide: {"dir": "guides/demo", "engine_labels": {"vllm": "vLLM"}}',
      '---',
      '',
      '[arch](../../docs/architecture/README.md)',
      '[gw](../../docs/infrastructure/gateway)',
      '[missing](../../docs/nope.md)',
      '[values](./router/values.yaml)',
      '[other](../flow-control/tuning.md)',
      '[helpers](../../helpers/hf-token.md)',
      '[bench](./bench/run1/README.md#results)',
      '![chart](bench/run1/chart.png)',
      '<img src="bench/run1/x.svg">',
      '[anchor](#foo)',
    ].join('\n'),
  );
  assert.match(out, /^---\ntitle: "Demo"\nllmd_guide: \{"dir"/, 'frontmatter untouched');
  assert.match(out, /\[arch\]\(\.\.\/\.\.\/\.\.\/architecture\/README\.md\)/);
  assert.match(out, /\[gw\]\(\.\.\/\.\.\/\.\.\/infrastructure\/gateway\/README\.md\)/);
  assert.ok(out.includes(`[missing](${GH}/tree/release-0.9/docs/nope.md)`));
  assert.ok(out.includes(`[values](${GH}/tree/release-0.9/guides/demo/router/values.yaml)`));
  assert.ok(out.includes(`[other](${GH}/tree/release-0.9/guides/flow-control/tuning.md)`));
  assert.ok(out.includes(`[helpers](${GH}/tree/release-0.9/helpers/hf-token.md)`));
  assert.ok(out.includes('[bench](./benchmark-run1.md#results)'));
  assert.ok(out.includes('![chart](/img/docs/guides/demo/bench/run1/chart.png)'));
  assert.ok(out.includes('<img src="/img/docs/guides/demo/bench/run1/x.svg" />'));
  assert.ok(out.includes('[anchor](#foo)'));
});

test('child guide page images and links', () => {
  const { run } = setup();
  const out = run('well-lit-paths/foundations/demo/benchmark-run1.md', '![l](latency.png)\n[up](../../README.md)\n{x}');
  assert.ok(out.includes('![l](/img/docs/guides/demo/bench/run1/latency.png)'));
  assert.ok(out.includes('[up](./index.mdx)'));
  assert.ok(out.includes('&#123;x&#125;'), '.md pages keep brace escaping');
});

test('regular docs link to published guides in-site, other guides to GitHub at ref', () => {
  const { run } = setup();
  const out = run(
    'operations/x.md',
    [
      '[g](../../guides/demo/README.md#verification)',
      '[g2](../../guides/demo)',
      '[ms](../../guides/demo/modelserver/gpu/kustomization.yaml)',
      '[pd](../../guides/pd/README.md)',
      '[doc](../architecture/README.md)',
    ].join('\n'),
  );
  assert.ok(out.includes('[g](../well-lit-paths/foundations/demo/index.mdx#verification)'));
  assert.ok(out.includes('[g2](../well-lit-paths/foundations/demo/index.mdx)'));
  assert.ok(out.includes(`[ms](${GH}/tree/release-0.9/guides/demo/modelserver/gpu/kustomization.yaml)`));
  assert.ok(out.includes(`[pd](${GH}/tree/release-0.9/guides/pd)`));
  assert.ok(out.includes('[doc](../architecture/README.md)'));
});

test('no sync map: defaults to main', () => {
  const docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-'));
  fs.mkdirSync(path.join(docsDir, 'a'));
  const pp = makeDocsPreprocessor({ docsDir });
  const out = pp({ filePath: path.join(docsDir, 'a/b.md'), fileContent: '[g](../../guides/x/README.md)' });
  assert.equal(out, `[g](${GH}/tree/main/guides/x)`);
});

test('guideToMdx converts variant, tab and env groups', () => {
  const src = [
    '<!-- guide:env.static start -->',
    '```bash',
    'export ACCELERATOR_TYPE=gpu # options: gpu, amd',
    '```',
    '<!-- llm-d-cicd:skip start -->',
    '```bash',
    'export HF_TOKEN=X',
    '```',
    '<!-- llm-d-cicd:skip end -->',
    '<!-- guide:env.static end -->',
    '',
    '<!-- guide:deploy start -->',
    '<!-- variants:start -->',
    '<details open data-when="ACCELERATOR_TYPE=gpu">',
    '<summary><b>NVIDIA GPU</b></summary>',
    '',
    '```bash',
    'echo {gpu} <x>',
    '```',
    '',
    '</details>',
    '<details data-when="ACCELERATOR_TYPE=amd,tpu/v7;MODEL_SERVER=vllm"><summary><b>Other</b></summary>',
    '',
    'text {braces}',
    '',
    '</details>',
    '<!-- variants:end -->',
    '<!-- guide:deploy end -->',
    '',
    '<!-- tabs:start group=engine -->',
    '<details open>',
    '<summary><b>vLLM</b></summary>',
    '',
    'v',
    '',
    '</details>',
    '<details>',
    '<summary><b>TensorRT-LLM</b></summary>',
    '',
    't',
    '',
    '</details>',
    '<!-- tabs:end -->',
    '',
    '<details>',
    '<summary><h4>Gateway Mode</h4></summary>',
    '',
    'a < b and `x {y}` <br> <https://x.io>',
    '',
    '</details>',
    '<!-- multi',
    'line -->',
  ].join('\n');
  const out = guideToMdx(src, { meta: { engine_labels: { vllm: 'vLLM', trtllm: 'TensorRT-LLM' } } });
  assert.ok(out.includes('<GuideEnv blocks={["export ACCELERATOR_TYPE=gpu # options: gpu, amd","export HF_TOKEN=X"]} />'), out);
  assert.ok(out.includes('<VariantGroup>'));
  assert.ok(out.includes('<Variant when="ACCELERATOR_TYPE=gpu" label="NVIDIA GPU">'));
  assert.ok(out.includes('<Variant when="ACCELERATOR_TYPE=amd,tpu/v7;MODEL_SERVER=vllm" label="Other">'));
  assert.equal((out.match(/<\/Variant>/g) || []).length, 2);
  assert.ok(out.includes('</VariantGroup>'));
  assert.ok(out.includes('echo {gpu} <x>'), 'code fences untouched');
  assert.ok(out.includes('text &#123;braces&#125;'));
  assert.ok(out.includes('<Tabs groupId="engine" queryString="engine">'));
  assert.ok(out.includes('<TabItem value="vllm" label="vLLM" default>'));
  assert.ok(out.includes('<TabItem value="trtllm" label="TensorRT-LLM">'));
  assert.ok(out.includes('</Tabs>'));
  assert.ok(!/<!--/.test(out), 'no HTML comments remain');
  assert.ok(out.includes('{/* guide:deploy start */}'));
  assert.ok(out.includes('{/* multi\nline */}'));
  assert.ok(out.includes('<summary><h4>Gateway Mode</h4></summary>'), 'non-group details untouched');
  assert.ok(out.includes('a &lt; b and `x {y}` <br /> [https://x.io](https://x.io)'));
  assert.ok(!out.includes('<details open data-when'));
});

test('mdxSafeLine keeps tags and escapes stray characters', () => {
  assert.equal(mdxSafeLine('<b>x</b> {a} <img src="a.png">'), '<b>x</b> &#123;a&#125; <img src="a.png" />');
  assert.equal(mdxSafeLine('x <= 3'), 'x &lt;= 3');
  assert.equal(mdxSafeLine('<!-- c --> t'), '{/* c */} t');
});

test('regular .mdx docs are not MDX-converted', () => {
  const { docsDir } = setup();
  fs.writeFileSync(path.join(docsDir, 'getting-started.mdx'), '');
  const pp = makeDocsPreprocessor({ docsDir });
  const src = 'import X from "y";\n\n<X a={1} />\n<!-- keep -->';
  assert.equal(pp({ filePath: path.join(docsDir, 'getting-started.mdx'), fileContent: src }), src);
});

test('guideToMdx converts deployment-mode tab groups', () => {
  const src = [
    '<!-- tabs:start group=mode -->',
    '<details open>',
    '<summary><b>Standalone Mode</b></summary>',
    '',
    'standalone text',
    '',
    '</details>',
    '<details>',
    '<summary><b>Gateway Mode</b></summary>',
    '',
    'gateway text',
    '',
    '</details>',
    '<!-- tabs:end -->',
  ].join('\n');
  const out = guideToMdx(src, { meta: { engine_labels: { vllm: 'vLLM' } } });
  assert.ok(out.includes('<Tabs groupId="mode" queryString="mode">'));
  assert.ok(out.includes('<TabItem value="standalone" label="Standalone Mode" default>'));
  assert.ok(out.includes('<TabItem value="gateway" label="Gateway Mode">'));
  assert.ok(!out.includes('<details'));
});

test('guideToMdx: tabs with data-when get a TabSync driven by the README', () => {
  const src = [
    '<!-- tabs:start group=modelserver -->',
    '<details open>',
    '<summary><b>Default</b></summary>',
    '',
    'std',
    '',
    '</details>',
    '<details data-when="ACCELERATOR_TYPE=tpu/v7-dynamic-slice">',
    '<summary><b>Google TPU v7 (dynamic slicing)</b></summary>',
    '',
    'ds',
    '',
    '</details>',
    '<!-- tabs:end -->',
    '',
    '<!-- tabs:start group=mode -->',
    '<details open>',
    '<summary><b>Standalone Mode</b></summary>',
    '',
    's',
    '',
    '</details>',
    '<!-- tabs:end -->',
  ].join('\n');
  const out = guideToMdx(src, { meta: {} });
  assert.ok(out.includes('<TabItem value="google-tpu-v7-dynamic-slicing" label="Google TPU v7 (dynamic slicing)">'), out);
  assert.ok(
    out.includes(
      '<TabSync groupId="modelserver" items={[{"value":"default","when":null,"default":true},' +
        '{"value":"google-tpu-v7-dynamic-slicing","when":"ACCELERATOR_TYPE=tpu/v7-dynamic-slice","default":false}]} />',
    ),
    out,
  );
  // Groups without data-when stay plain Docusaurus Tabs.
  assert.equal((out.match(/<TabSync /g) || []).length, 1);
});
