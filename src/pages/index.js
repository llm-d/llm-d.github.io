import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Welcome from '@site/src/components/Welcome'
import Install from '@site/src/components/Install'
import Demo from '@site/src/components/Demo'
import About from '@site/src/components/About'

import VideoEmbed from '@site/src/components/VideoEmbed'

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to the ${siteConfig.title} website!`}
      description="llm-d: a Kubernetes-native high-performance distributed LLM inference framework">
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
  );
}
