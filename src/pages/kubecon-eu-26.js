import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import styles from './kubecon-eu-26.module.css';

const sessions = [
  {
    title: 'Panel: Routing Intelligence Vs Traffic Control: Architectural Tradeoffs for AI Inference in Gateway API',
    date: 'Mon, Mar 23',
    time: '12:45 – 13:20 CET',
    location: 'Hall 7 | Room B',
    href: 'https://colocatedeventseu2026.sched.com/event/2DY4J/panel-routing-intelligence-vs-traffic-control-how-ai-is-shaping-mesh-gateways-lin-sun-soloio-rob-salmond-google-kevin-foster-red-hat-john-howard-soloio-dan-sun-bloomberg',
  },
  {
    title: 'Cloud Native Theater | Istio Day: Running State of the Art Inference with Istio and llm-d',
    date: 'Tue, Mar 24',
    time: '14:30 – 15:00 CET',
    location: 'Hall 1-5 | Tram Zone | Cloud Native Theater',
    href: 'https://kccnceu2026.sched.com/event/2EG0w/cloud-native-theater-istio-day-running-state-of-the-art-llms-at-scale-with-istio-ambient-mode-keith-mattix-ii-microsoft-and-nili-guy-ibm',
  },
  {
    title: 'Route, Serve, Adapt, Repeat: Adaptive Routing for AI Inference Workloads in Kubernetes',
    date: 'Wed, Mar 25',
    time: '11:45 – 12:15 CET',
    location: 'Auditorium',
    href: 'https://kccnceu2026.sched.com/event/2CW2C/route-serve-adapt-repeat-adaptive-routing-for-ai-inference-workloads-in-kubernetes-nir-rozenbaum-ibm-kellen-swain-google',
  },
  {
    title: 'Tutorial: KV-Cache Wins You Can Feel: Building AI-Aware LLM Routing on Kubernetes',
    date: 'Thu, Mar 26',
    time: '11:00 – 12:15 CET',
    location: 'Elicium 1',
    href: 'https://kccnceu2026.sched.com/event/2CW5y/tutorial-kv-cache-wins-you-can-feel-building-ai-aware-llm-routing-on-kubernetes-tyler-michael-smith-red-hat-kay-yan-daocloud-danny-harnik-michal-malka-maroon-ayoub-ibm',
  },
  {
    title: 'Evolving KServe: The Unified Model Inference Platform for Both Predictive and Generative AI',
    date: 'Thu, Mar 26',
    time: '13:45 – 14:15 CET',
    location: 'G102-103',
    href: 'https://sched.co/2EF54',
  },
  {
    title: 'Redefining SLIs for LLM Inference: Managing Hybrid Cloud with vLLM & llm-d',
    date: 'Thu, Mar 26',
    time: '14:30 – 15:00 CET',
    location: 'Hall 7 | Room A',
    href: 'https://kccnceu2026.sched.com/event/2CW7B/redefining-slis-for-llm-inference-managing-hybrid-cloud-with-vllm-llm-d-christopher-nuland-hilliary-lipsig-red-hat',
  },
];

const blogPosts = [
  {
    tag: 'Release',
    title: 'llm-d 0.5: Sustaining Performance at Scale',
    description: 'Hierarchical KV-cache offloading, LoRA-aware scheduling, UCCL networking, and scale-to-zero autoscaling.',
    href: '/blog/llm-d-v0.5-sustaining-performance-at-scale',
  },
  {
    tag: 'Deep Dive',
    title: 'Native KV Cache Offloading to Any Filesystem with llm-d',
    description: 'Offload KV cache to shared storage for cross-replica reuse and up to 16.8x faster TTFT.',
    href: '/blog/native-kv-cache-offloading-to-any-file-system-with-llm-d',
  },
  {
    tag: 'Release',
    title: 'llm-d 0.4: Achieve SOTA Performance Across Accelerators',
    description: '50% lower latency for MoE models via speculative decoding, expanded TPU and XPU support.',
    href: '/blog/llm-d-v0.4-achieve-sota-inference-across-accelerators',
  },
  {
    tag: 'Deep Dive',
    title: 'KV-Cache Wins You Can See',
    description: 'How precise KV-cache aware scheduling delivers 57x faster responses and 2x throughput.',
    href: '/blog/kvcache-wins-you-can-see',
  },
  {
    tag: 'Deep Dive',
    title: 'Intelligent Inference Scheduling with llm-d',
    description: 'Prefix-aware, load-balanced routing to maximize LLM throughput and minimize latency on Kubernetes.',
    href: '/blog/intelligent-inference-scheduling-with-llm-d',
  },
  {
    tag: 'Release',
    title: 'llm-d 0.3: Wider Well-Lit Paths for Scalable Inference',
    description: 'Google TPU and Intel XPU support, wide expert parallelism, predicted latency scheduling, and Inference Gateway GA.',
    href: '/blog/llm-d-v0.3-expanded-hardware-faster-perf-and-igw-ga',
  },
];

export default function KubeConEU26() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="keywords" content="llm-d, KubeCon, CloudNativeCon, Europe 2026, Amsterdam, distributed inference, LLM, Kubernetes, talks, sessions" />
        <meta property="og:title" content="llm-d at KubeCon + CloudNativeCon Europe 2026" />
        <meta property="og:description" content="Find llm-d talks, blog posts, and resources at KubeCon + CloudNativeCon Europe 2026 in Amsterdam." />
      </Head>
      <Layout
        title="llm-d at KubeCon EU 2026"
        description="Find llm-d talks, blog posts, and resources at KubeCon + CloudNativeCon Europe 2026 in Amsterdam.">
        <main className={styles.page}>

          {/* Hero */}
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <img
                src="/img/llm-d-icon.png"
                alt="llm-d"
                className={styles.heroLogo}
              />
              <p className={styles.heroEvent}>KubeCon + CloudNativeCon Europe 2026</p>
              <h1 className={styles.heroTitle}>
                llm-d at KubeCon EU
              </h1>
              <p className={styles.heroMeta}>
                Amsterdam, The Netherlands &middot; March 23–26, 2026
              </p>
              <div className={styles.heroButtons}>
                <a href="/docs/guide" className={styles.btnPrimary}>
                  Get Started with llm-d
                </a>
                <a
                  href="https://github.com/llm-d/llm-d"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnSecondary}
                >
                  Star us on GitHub
                </a>
              </div>
            </div>
          </section>

          {/* Talks & Sessions */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>llm-d Talks &amp; Sessions</h2>
            <p className={styles.sectionSubtitle}>
              Catch these llm-d sessions across co-located events and the main conference.
            </p>
            <div className={styles.sessionGrid}>
              {sessions.map((s) => (
                <div key={s.title} className={styles.sessionCard}>
                  <div className={styles.sessionInfo}>
                    <h3 className={styles.sessionTitle}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer">
                        {s.title}
                      </a>
                    </h3>
                    <div className={styles.sessionMeta}>
                      <span>{s.date}</span>
                      <span>&middot;</span>
                      <span>{s.time}</span>
                      <span>&middot;</span>
                      <span>{s.location}</span>
                    </div>
                  </div>
                  <div className={styles.sessionAction}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sessionBtn}
                    >
                      Details
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Blog Posts */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>From the Blog</h2>
            <p className={styles.sectionSubtitle}>
              Dive deeper into the ideas behind our KubeCon talks.
            </p>
            <div className={styles.blogGrid}>
              {blogPosts.map((post) => (
                <div key={post.title} className={styles.blogCard}>
                  <span className={styles.blogTag}>{post.tag}</span>
                  <h3 className={styles.blogTitle}>
                    <a href={post.href}>{post.title}</a>
                  </h3>
                  <p className={styles.blogDescription}>{post.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Videos callout */}
          <section className={styles.section}>
            <div className={styles.videosCallout}>
              <div className={styles.videosCalloutText}>
                <h3>Watch Previous Talks</h3>
                <p>
                  Catch up on llm-d conference talks from KubeCon, PyTorch Conference, and DevConf.
                </p>
              </div>
              <a href="/videos" className={styles.btnPrimary}>
                Browse Videos
              </a>
            </div>
          </section>

          {/* Connect CTA */}
          <section className={styles.connectSection}>
            <h2 className={styles.connectTitle}>Connect with us at KubeCon</h2>
            <p className={styles.connectText}>
              Come say hi, ask questions, or dive into the code. We'd love to meet you.
            </p>
            <div className={styles.connectButtons}>
              <a
                href="https://github.com/llm-d/llm-d"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                Star us on GitHub
              </a>
              <a href="/slack" className={styles.btnSecondary}>
                Join Slack
              </a>
              <a href="/docs/guide" className={styles.btnSecondary}>
                Read the Docs
              </a>
            </div>
          </section>

        </main>
      </Layout>
    </>
  );
}
