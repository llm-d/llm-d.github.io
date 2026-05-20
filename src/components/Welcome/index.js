import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const ArrowIcon = () => (
  <svg
    className={styles.arrowIcon}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m13 5 7 7-7 7" />
  </svg>
);

const RoutingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5" cy="12" r="2.2" />
    <circle cx="19" cy="5" r="2.2" />
    <circle cx="19" cy="12" r="2.2" />
    <circle cx="19" cy="19" r="2.2" />
    <path d="M7 12h2" />
    <path d="M9 12c3 0 5-7 8-7" />
    <path d="M9 12h8" />
    <path d="M9 12c3 0 5 7 8 7" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </svg>
);

const ServerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4"  width="18" height="5" rx="1.5" />
    <rect x="3" y="11" width="18" height="5" rx="1.5" />
    <rect x="3" y="18" width="18" height="3" rx="1.5" />
    <circle cx="7" cy="6.5"  r="0.6" fill="currentColor" />
    <circle cx="7" cy="13.5" r="0.6" fill="currentColor" />
  </svg>
);

const GaugeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 17a9 9 0 1 1 17 0" />
    <path d="m14 9-3 5" />
    <circle cx="11" cy="14" r="1.2" />
  </svg>
);

const stats = [
  {
    number: '3×',
    claim: 'Higher output throughput vs round-robin',
    attribution: 'Llama 3.1 70B · Tesla / Red Hat',
  },
  {
    number: '70%',
    claim: 'Higher tokens/sec with prefill/decode disaggregation',
    attribution: 'GPT-OSS on NVIDIA B200 · AWS',
  },
  {
    number: '40%',
    claim: 'Reduction in TTFT with predicted-latency scheduling',
    attribution: 'NVIDIA GPUs · Google',
  },
  {
    number: '13.9×',
    claim: 'Throughput with hierarchical KV offloading',
    attribution: '4× NVIDIA H100, 250 concurrent users',
  },
  {
    number: '50k',
    claim: 'Tokens/sec cluster throughput with Wide Expert-Parallelism',
    attribution: '16×16 NVIDIA B200',
  },
];

const guides = [
  {
    Icon: RoutingIcon,
    title: 'LLM-Aware Load Balancing',
    tagline: 'Route every request to the replica that will serve it fastest.',
    description:
      "llm-d's endpoint picker scores each replica in real time across four signals: prefix cache locality, KV-cache utilization, queue depth, and predicted latency. Each request is dispatched to the replica with the lowest expected tail latency — delivering order-of-magnitude p99 improvements over round-robin routing, with no additional hardware.",
    linkLabel: 'Explore LLM-aware routing',
    to: 'https://llm-d.ai/docs/guides/optimized-baseline',
  },
  {
    Icon: ServerIcon,
    title: 'Serving Large Language Models',
    tagline: 'Scale prompt processing and token generation independently.',
    description:
      'Prefill and decode have fundamentally different resource profiles. llm-d splits them across dedicated worker pools and transfers KV-cache between phases over RDMA via NIXL. The result is faster TTFT, more predictable TPOT, and better GPU utilization across the cluster.',
    linkLabel: 'See how disaggregation works',
    to: 'https://llm-d.ai/docs/guides/pd-disaggregation',
  },
  {
    Icon: DatabaseIcon,
    title: 'Advanced KV-Cache Management',
    tagline: 'Cache at memory speed. Spill at storage cost.',
    description:
      'llm-d extends KV-cache beyond accelerator HBM through a configurable storage hierarchy: HBM, CPU memory, local SSD, and shared remote storage (in progress). Hot prefixes stay close to the accelerator; cold prefixes spill to cheaper tiers automatically. You serve longer contexts and higher concurrency without adding GPUs.',
    linkLabel: 'Configure tiered caching',
    to: 'https://llm-d.ai/docs/guides/tiered-prefix-cache',
  },
  {
    Icon: GaugeIcon,
    title: 'Operational Excellence',
    tagline: 'Scale for the load you have, on the hardware you have.',
    description:
      'Two complementary patterns, both built on Kubernetes primitives. HPA scales replicas using live inference signals — queue depth and request counts from the endpoint picker. The Workload Variant Autoscaler routes across model variants on heterogeneous hardware to meet SLOs at the lowest cost.',
    linkLabel: 'Set up autoscaling',
    to: 'https://llm-d.ai/docs/guides/workload-autoscaling',
  },
];

export default function Welcome() {
  const cncfLogoUrl = useBaseUrl('/img/cncf-logo.svg');
  const founderLogos = [
    { src: useBaseUrl('/img/logos/founders/red-hat.svg'), alt: 'Red Hat' },
    { src: useBaseUrl('/img/logos/founders/google-cloud.svg'), alt: 'Google Cloud' },
    { src: useBaseUrl('/img/logos/founders/ibm.svg'), alt: 'IBM Research' },
    { src: useBaseUrl('/img/logos/founders/coreweave.svg'), alt: 'CoreWeave' },
    { src: useBaseUrl('/img/logos/founders/nvidia.svg'), alt: 'NVIDIA' },
  ];
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroHeading}>
            Production-grade distributed inference built for how LLMs work.
          </h1>
          <p className={styles.heroSubtext}>
            llm-d orchestrates inference workloads across your cluster —
            bringing LLM-aware routing, disaggregated serving, and tiered KV
            caching to the Kubernetes primitives you already run.
          </p>
          <div className={styles.heroCtas}>
            <a
              className={`${styles.ctaButton} ${styles.ctaPrimary}`}
              href="https://llm-d.ai/docs/getting-started"
            >
              Get started
            </a>
            <a
              className={`${styles.ctaButton} ${styles.ctaSecondary}`}
              href="https://llm-d.ai/docs/architecture"
            >
              View the architecture
            </a>
          </div>
          <div className={styles.heroFounders}>
            <span className={styles.heroFoundersLabel}>Founded by</span>
            <div className={styles.heroFoundersLogos}>
              {founderLogos.map(({ src, alt }) => (
                <img key={alt} src={src} alt={alt} />
              ))}
            </div>
          </div>
          <a
            className={styles.heroCncf}
            href="https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={cncfLogoUrl} alt="" aria-hidden="true" />
            <span>llm-d is a CNCF Sandbox project</span>
          </a>
        </div>
      </section>

      <section className={styles.stats}>
        <div className={styles.statsInner}>
          <h2 className={styles.statsHeading}>Validated in production.</h2>
          <p className={styles.statsSubhead}>
            Performance gains from production deployments and partner benchmarks.
          </p>
          <div className={styles.statsGrid}>
            {stats.map(({ number, claim, attribution }) => (
              <div key={claim} className={styles.statCard}>
                <div className={styles.statNumber}>{number}</div>
                <p className={styles.statClaim}>{claim}</p>
                <p className={styles.statAttribution}>{attribution}</p>
              </div>
            ))}
          </div>
          <div className={styles.statsFooter}>
            <a
              className={styles.sectionCta}
              href="https://prism.llm-d.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore performance analysis
              <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      <section className={styles.guides}>
        <div className={styles.guidesInner}>
          <h2 className={styles.guidesHeading}>Start with the pattern that matches your bottleneck.</h2>
          <p className={styles.guidesSubhead}>
            Each guide is a tested deployment pattern with concrete configuration — pick your path to production inference.
          </p>
          <div className={styles.guidesGrid}>
            {guides.map(({ Icon, title, tagline, description, linkLabel, to }) => (
              <article key={title} className={styles.card}>
                <div className={styles.cardIcon} aria-hidden="true">
                  <Icon />
                </div>
                <h3 className={styles.cardTitle}>{title}</h3>
                <p className={styles.cardTagline}>{tagline}</p>
                <p className={styles.cardDescription}>{description}</p>
                <Link className={styles.cardLink} to={to}>
                  {linkLabel}
                  <ArrowIcon />
                </Link>
              </article>
            ))}
          </div>
          <div className={styles.guidesFooter}>
            <Link className={styles.sectionCta} to="/docs/guides">
              See all guides
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
