import React, { Children, isValidElement } from 'react';
import CodeBlock from '@theme/CodeBlock';
import Link from '@docusaurus/Link';
import {
  useGuide,
  whenMatches,
  acceleratorKeys,
  engineKeys,
  isSupported,
  engineCell,
  supportedEngines,
} from './variantStore';
import styles from './styles.module.css';

/**
 * A block shown only when it matches the selected accelerator/engine.
 * Outside guide pages (no selector context) every variant is rendered with
 * its label as a heading, mirroring the GitHub <details> fallback.
 */
export function Variant({ when, label, forceShow, children }) {
  const guide = useGuide();
  if (!guide) {
    return (
      <div className={styles.variantFallback}>
        <p className={styles.variantFallbackLabel}>
          <strong>{label}</strong>
        </p>
        {children}
      </div>
    );
  }
  if (!forceShow && !whenMatches(when, guide.selection)) return null;
  return (
    <div className={styles.variant} data-when={when}>
      <div className={styles.variantLabel}>{label}</div>
      {children}
    </div>
  );
}

/** Wraps a set of <Variant>s; falls back to the first variant if none matches. */
export function VariantGroup({ children }) {
  const guide = useGuide();
  if (!guide) return <div className={styles.variantGroup}>{children}</div>;
  const variants = Children.toArray(children).filter((c) => isValidElement(c) && c.props?.when !== undefined);
  const any = variants.some((c) => whenMatches(c.props.when, guide.selection));
  return (
    <div className={styles.variantGroup}>
      {any ? children : variants[0] ? React.cloneElement(variants[0], { forceShow: true }) : children}
    </div>
  );
}

function accLabel(meta, acc) {
  return meta?.support?.accelerators?.[acc]?.label ?? acc;
}
function engLabel(meta, eng) {
  return meta?.support?.engines?.[eng] ?? meta?.engine_labels?.[eng] ?? eng;
}

/** Rewrite the export lines of the guide env block for the current selection. */
export function applySelectionToEnv(block, meta, selection) {
  if (!selection) return block;
  let out = block
    .replace(/^(\s*export\s+ACCELERATOR_TYPE=)(\S*)/m, `$1${selection.accelerator}`)
    .replace(/^(\s*export\s+MODEL_SERVER=)(\S*)/m, `$1${selection.engine}`);
  const model = meta?.support?.accelerators?.[selection.accelerator]?.model;
  if (model) out = out.replace(/^(\s*export\s+MODEL=)(\S*)/m, `$1${model}`);
  return out;
}

/** The guide:env.static block, rendered with the current selection applied. */
export function GuideEnv({ blocks = [] }) {
  const guide = useGuide();
  return (
    <div className={styles.guideEnv}>
      {blocks.map((b, i) => (
        <CodeBlock key={i} language="bash">
          {applySelectionToEnv(b, guide?.meta, guide?.selection)}
        </CodeBlock>
      ))}
    </div>
  );
}

/** "Run this guide" banner: branch-pinned clone + REPO_ROOT reminder. */
export function RunBanner({ meta }) {
  const ref = meta.ref || 'main';
  const repo = meta.repo || 'https://github.com/llm-d/llm-d';
  const cloneUrl = `${repo}.git`;
  const repoName = repo.split('/').pop();
  const cmd = `git clone ${cloneUrl} && cd ${repoName} && git checkout ${ref}\nexport REPO_ROOT=$(pwd)`;
  return (
    <div className={styles.banner} data-llmd-guide-banner="">
      <div className={styles.bannerHeader}>
        <strong>Run this guide</strong>
        <Link className={styles.sourceLink} href={`${repo}/tree/${ref}/${meta.dir}`}>
          View source on GitHub
        </Link>
      </div>
      <p className={styles.bannerText}>
        The commands below use files from the <code>{repoName}</code> repository at <code>{ref}</code>. Clone it first;
        every command assumes <code>REPO_ROOT</code> points at that clone.
      </p>
      <CodeBlock language="bash">{cmd}</CodeBlock>
    </div>
  );
}

/** Page-level accelerator × engine picker driven by the guide support matrix. */
export function VariantSelector() {
  const guide = useGuide();
  if (!guide?.meta?.support?.accelerators) return null;
  const { meta, selection, fellBack, setAccelerator, setEngine } = guide;
  const support = meta.support;
  const accs = acceleratorKeys(support);
  const engs = engineKeys(support);
  const cell = engineCell(support, selection.accelerator, selection.engine);
  const blocked = engs.filter((e) => !isSupported(support, selection.accelerator, e));

  return (
    <div className={styles.selector} data-llmd-variant-selector="">
      <div className={styles.selectorRow} role="group" aria-label="Accelerator">
        <span className={styles.selectorLabel}>Accelerator</span>
        <div className={styles.buttons}>
          {accs.map((a) => {
            const none = supportedEngines(support, a).length === 0;
            return (
              <button
                key={a}
                type="button"
                className={a === selection.accelerator ? styles.buttonActive : styles.button}
                aria-pressed={a === selection.accelerator}
                disabled={none}
                title={none ? `${accLabel(meta, a)} is not yet supported by this guide` : accLabel(meta, a)}
                onClick={() => setAccelerator(a)}>
                {accLabel(meta, a)}
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.selectorRow} role="group" aria-label="Engine">
        <span className={styles.selectorLabel}>Engine</span>
        <div className={styles.buttons}>
          {engs.map((e) => {
            const ok = isSupported(support, selection.accelerator, e);
            const issue = engineCell(support, selection.accelerator, e)?.issue;
            return (
              <button
                key={e}
                type="button"
                className={e === selection.engine ? styles.buttonActive : styles.button}
                aria-pressed={e === selection.engine}
                disabled={!ok}
                title={
                  ok
                    ? engLabel(meta, e)
                    : `${engLabel(meta, e)} is not supported on ${accLabel(meta, selection.accelerator)}${issue ? ` (tracking: ${issue})` : ''}`
                }
                onClick={() => setEngine(e)}>
                {engLabel(meta, e)}
              </button>
            );
          })}
        </div>
        {cell?.status && <span className={styles.status} data-status={cell.status}>{cell.status}</span>}
      </div>
      {blocked.length > 0 && (
        <p className={styles.muted}>
          Not supported on {accLabel(meta, selection.accelerator)}:{' '}
          {blocked.map((e, i) => {
            const issue = engineCell(support, selection.accelerator, e)?.issue;
            return (
              <span key={e}>
                {i > 0 && ', '}
                {engLabel(meta, e)}
                {issue && (
                  <>
                    {' '}
                    (<Link href={issue}>tracking issue</Link>)
                  </>
                )}
              </span>
            );
          })}
        </p>
      )}
      {fellBack && (
        <p className={styles.notice} role="status">
          Your saved selection isn&apos;t supported by this guide; showing {accLabel(meta, selection.accelerator)} ·{' '}
          {engLabel(meta, selection.engine)} instead.
        </p>
      )}
    </div>
  );
}
