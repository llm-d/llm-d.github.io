import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import {Database, Layers, Network, Split, TrendingUp} from 'lucide-react';

function HeroSection(): React.JSX.Element {
  return (
    <header className="hero hero--llmd">
      <div className="container">
        <img
          src={useBaseUrl('/img/llm-d-logo.png')}
          alt="llm-d"
          className="hero__logo"
        />
        <h1 className="hero__title">
          Kubernetes-native distributed inference serving for LLMs
        </h1>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/getting-started/quickstart"
            style={{marginLeft: '0.75rem'}}>
            Quickstart
          </Link>
        </div>
      </div>
    </header>
  );
}

const capabilities = [
  {
    icon: Network,
    title: 'LLM-Aware Load Balancing',
    tagline:
      'Route every request to the replica that will serve it fastest.',
    body:
      "llm-d's endpoint picker scores each replica in real time across four signals: prefix cache locality, KV-cache utilization, queue depth, and predicted latency. Each request is dispatched to the replica with the lowest expected tail latency — delivering order-of-magnitude p99 improvements over round-robin routing, with no additional hardware.",
    ctaLabel: 'Explore LLM-aware routing',
    to: '/docs/guides/intelligent-inference-scheduling',
  },
  {
    icon: Split,
    title: 'Prefill / Decode Disaggregation',
    tagline:
      'Scale prompt processing and token generation independently.',
    body:
      'Prefill and decode have fundamentally different resource profiles. llm-d splits them across dedicated worker pools and transfers KV-cache between phases over RDMA via NIXL. The result is faster TTFT, more predictable TPOT, and better GPU utilization across the cluster.',
    ctaLabel: 'See how disaggregation works',
    to: '/docs/guides/pd-disaggregation',
  },
  {
    icon: Layers,
    title: 'Wide Expert Parallelism',
    tagline:
      "Serve frontier MoE models that don't fit on a single node.",
    body:
      'llm-d combines data parallelism and expert parallelism across nodes to deploy large mixture-of-experts models like DeepSeek-R1. This pattern maximizes KV-cache space, enables long-context online serving, and supports high-throughput generation for batch and RL workloads.',
    ctaLabel: 'Deploy wide-EP models',
    to: '/docs/guides/wide-expert-parallelism',
  },
  {
    icon: Database,
    title: 'Tiered KV Prefix Caching',
    tagline: 'Cache at memory speed. Spill at storage cost.',
    body:
      'llm-d extends KV-cache beyond accelerator HBM through a configurable storage hierarchy: HBM, CPU memory, local SSD, and shared remote storage (in progress). Hot prefixes stay close to the accelerator; cold prefixes spill to cheaper tiers automatically. You serve longer contexts and higher concurrency without adding GPUs.',
    ctaLabel: 'Configure tiered caching',
    to: '/docs/guides/kv-cache-management',
  },
  {
    icon: TrendingUp,
    title: 'Workload Autoscaling',
    tagline: 'Scale for the load you have, on the hardware you have.',
    body:
      'Two complementary patterns, both built on Kubernetes primitives. HPA scales replicas using live inference signals — queue depth and request counts from the endpoint picker. The Workload Variant Autoscaler routes across model variants on heterogeneous hardware to meet SLOs at the lowest cost.',
    ctaLabel: 'Set up autoscaling',
    to: '/docs/guides/workload-autoscaling',
  },
];

function CapabilitiesSection(): React.JSX.Element {
  return (
    <section className="capabilities-section">
      <div className="container">
        <h2 className="capabilities-heading">Key capabilities</h2>
        <div className="capabilities-grid">
          {capabilities.map(({icon: Icon, title, tagline, body, ctaLabel, to}) => (
            <article key={title} className="capability-card">
              <div className="capability-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <h3 className="capability-title">{title}</h3>
              <p className="capability-tagline">{tagline}</p>
              <p className="capability-body">{body}</p>
              <Link to={to} className="capability-cta">
                {ctaLabel} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title="Documentation" description={siteConfig.tagline}>
      <HeroSection />
      <main>
        <CapabilitiesSection />
      </main>
    </Layout>
  );
}
