import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Welcome from '@site/src/components/Welcome'
import Install from '@site/src/components/Install'
import Demo from '@site/src/components/Demo'
import About from '@site/src/components/About'

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to the ${siteConfig.title} website!`}
      description="When we go live a useful description will go into this tag">
      <main>
        <Welcome />
        {/* <About /> */}
        <Install />
        {/* <Demo /> */}
      </main>
    </Layout>
  );
}
