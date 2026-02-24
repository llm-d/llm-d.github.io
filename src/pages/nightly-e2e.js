import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import NightlyE2EStatus from '@site/src/components/NightlyE2EStatus';
import styles from './nightly-e2e.module.css';

export default function NightlyE2E() {
  return (
    <>
      <Head>
        <meta name="keywords" content="llm-d, nightly, e2e, end-to-end, testing, status, OCP, GKE, CKS, kubernetes" />
        <meta property="og:title" content="llm-d Nightly E2E Status" />
        <meta property="og:description" content="Live pass/fail status of llm-d nightly E2E workflows across OCP, GKE, and CKS platforms." />
      </Head>
      <Layout
        title="Nightly E2E"
        description="Live nightly E2E test status for llm-d across OCP, GKE, and CKS platforms">
      <main className={styles.statusPage}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroIcon}>&#x2713;</span>
              Nightly E2E Status
            </h1>
            <p className={styles.heroSubtitle}>
              Live pass/fail status of llm-d nightly end-to-end workflows
              across OCP, GKE, and CKS platforms.
            </p>
          </div>
        </div>

        <div className={styles.container}>
          <NightlyE2EStatus styles={styles} />
        </div>

        <div className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>Ready to get started?</h2>
          <p className={styles.ctaText}>
            Dive into our documentation or join our community to learn more.
          </p>
          <div className={styles.ctaButtons}>
            <a href="/docs/guide" className={styles.ctaButtonPrimary}>
              Read the Docs
            </a>
            <a href="/slack" className={styles.ctaButtonSecondary}>
              Join Slack
            </a>
          </div>
        </div>
      </main>
      </Layout>
    </>
  );
}
