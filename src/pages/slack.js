import { useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// /slack — host-agnostic redirect to the llm-d Slack invite (replaces the
// upstream Netlify redirect so it also works under `docusaurus serve` and
// any other host).
const SLACK_INVITE =
  'https://join.slack.com/t/llm-d/shared_invite/zt-3vjxmypf9-63gI5wHRhn6D60zzad67Bw';

export default function Slack() {
  useEffect(() => {
    window.location.replace(SLACK_INVITE);
  }, []);

  return (
    <Layout title="Join the llm-d Slack" description="Redirecting to the llm-d Slack invite">
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h1>Redirecting to Slack…</h1>
          <p>
            If you are not redirected,{' '}
            <Link to={SLACK_INVITE}>click here to join the llm-d Slack</Link>.
          </p>
        </div>
      </main>
    </Layout>
  );
}
