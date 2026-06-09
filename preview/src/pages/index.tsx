import React from 'react';
import {Redirect} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

// The docs landing page has been retired in favour of jumping straight to
// /getting-started. useBaseUrl picks the right prefix per build, so each
// versioned docs site (/docs/, /docs/dev/, /docs/X.Y.Z/) redirects to its
// own getting-started page.
export default function Home(): React.JSX.Element {
  return <Redirect to={useBaseUrl('/getting-started')} />;
}
