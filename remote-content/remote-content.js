// @ts-check

// Import community remote content sources
import contributeSource from './remote-sources/community/contribute.js';
import codeOfConductSource from './remote-sources/community/code-of-conduct.js';
import securitySource from './remote-sources/community/security.js';
import sigsSource from './remote-sources/community/sigs.js';

/**
 * Remote Content Plugin System
 *
 * Syncs community documentation from the llm-d/llm-d repository.
 * All other documentation is synced via the preview/scripts/sync-docs.sh system.
 *
 * To add new community remote content:
 * 1. Create a new file in remote-sources/community/
 * 2. Import it below
 * 3. Add it to the remoteContentPlugins array
 */

/**
 * Community remote content plugin configurations
 */
const remoteContentPlugins = [
  contributeSource,
  codeOfConductSource,
  securitySource,
  sigsSource,
];

export default remoteContentPlugins;
