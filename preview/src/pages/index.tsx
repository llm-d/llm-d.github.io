import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HeroSection() {
  return (
    <header className={clsx('hero hero--llmd')}>
      <div className="container">
        <img
          src="/preview/img/llm-d-logo.png"
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

const sections = [
  {
    title: 'Getting Started',
    to: '/docs/getting-started',
    description: 'Introduction to llm-d, quickstart guide, feature matrix, and release artifacts.',
  },
  {
    title: 'Architecture',
    to: '/docs/architecture',
    description: 'Core components — Proxy, InferencePool, EPP, Model Servers — and advanced features.',
  },
  {
    title: 'Well-Lit Paths',
    to: '/docs/well-lit-paths',
    description: 'Tested deployment recipes: scheduling, disaggregation, expert parallelism, caching.',
  },
  {
    title: 'User Guides',
    to: '/docs/user-guides/gateway',
    description: 'Gateway setup, API configuration, monitoring, multi-model deployment, and RDMA.',
  },
  {
    title: 'API Reference',
    to: '/docs/api-reference',
    description: 'API specifications and reference documentation.',
  },
];

function FeaturesSection() {
  return (
    <section className="container" style={{paddingBottom: '3rem'}}>
      <div className="features">
        {sections.map((s) => (
          <Link key={s.title} to={s.to} className="feature-card" style={{textDecoration: 'none', color: 'inherit'}}>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
          </Link>
        ))}
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
        <FeaturesSection />
      </main>
    </Layout>
  );
}
