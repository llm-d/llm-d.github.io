import { useEffect } from 'react';
import Head from '@docusaurus/Head';

// Hard redirect rather than React Router <Redirect/>: /docs/* is a separate
// Docusaurus build mounted as static files, so a client-side SPA push from
// the main app's router can't resolve it (it shows 404 until the user
// refreshes and the browser does a real HTTP GET). The meta-refresh + JS
// pair gives us a real page navigation on both SSR and CSR.
export default function Home() {
  useEffect(() => {
    window.location.replace('/docs/getting-started');
  }, []);
  return (
    <Head>
      <meta httpEquiv="refresh" content="0; url=/docs/getting-started" />
    </Head>
  );
}
