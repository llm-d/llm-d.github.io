import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import Welcome from '@site/src/components/Welcome'

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  const pageTitle = "Kubernetes-Native Distributed LLM Inference with vLLM";
  const pageDescription = "Deploy production LLM inference on Kubernetes with vLLM: intelligent scheduling, KV-cache optimization, and SOTA performance across accelerators";

  return (
    <>
      <Head>
        <meta name="keywords" content="llm-d, distributed inference, LLM inference, large language models, kubernetes, GPU optimization, KV cache, model serving, vLLM, state-of-the-art inference" />
        <meta property="og:title" content={`${siteConfig.title} - ${pageTitle}`} />
        <meta property="og:description" content={pageDescription} />
      </Head>
      <Layout
        title={`${siteConfig.title} - ${pageTitle}`}
        description={pageDescription}>
      <main>
        <Welcome />
      </main>
      </Layout>
    </>
  );
}
