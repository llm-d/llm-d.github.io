import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import Welcome from '@site/src/components/Welcome'
import Install from '@site/src/components/Install'
import VideoEmbed from '@site/src/components/VideoEmbed'

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <>
      <Head>
        <meta name="keywords" content="llm-d, distributed inference, LLM inference, large language models, kubernetes, GPU optimization, KV cache, model serving, vLLM, state-of-the-art inference" />
        <meta property="og:title" content="llm-d - Distributed LLM Inference Platform" />
        <meta property="og:description" content="Achieve state-of-the-art inference performance on any accelerator with intelligent scheduling, KV-cache optimization, and seamless scaling." />
      </Head>
      <Layout
        title={`Welcome to the ${siteConfig.title} website!`}
        description="llm-d: Achieve SOTA Inference Performance On Any Accelerator">
      <main>
        <Welcome />
        
        {/* Video Section */}
        <div className="video-section" style={{ 
          padding: '2rem 0', 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{ 
            width: '75%', 
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <VideoEmbed videoId="32MqYC3OydE" />
          </div>
        </div>
        
        {/* <About /> */}
        <Install />
        {/* <Demo /> */}
      </main>
      </Layout>
    </>
  );
}
