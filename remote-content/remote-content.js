// @ts-check

// Import community remote content sources
import contributeSource from './remote-sources/community/contribute.js';
import codeOfConductSource from './remote-sources/community/code-of-conduct.js';
import securitySource from './remote-sources/community/security.js';
import sigsSource from './remote-sources/community/sigs.js';

// Import architecture remote content sources
import architectureMainSource from './remote-sources/architecture/architecture-main.js';
import componentSources from './remote-sources/architecture/components-generator.js';

// Import guide remote content sources
import guideSources from './remote-sources/guide/guide-generator.js';

// Import usage remote content sources
import usageSources from './remote-sources/usage/usage-generator.js';

// Import infra providers remote content sources
import infraProviderSources from './remote-sources/infra-providers/infra-providers-generator.js';

/**
 * Remote Content Plugin System
 * 
 * This module is completely independent from other Docusaurus plugins.
 * It only manages remote content sources and can scale independently.
 * 
 * To add new remote content:
 * 1. Create a new file in remote-sources/DIRECTORY/ (architecture/, guide/, or community/)
 * 2. Import it below in the appropriate section
 * 3. Add it to the remoteContentPlugins array
 * 
 * Users can manage their own plugins separately in docusaurus.config.js
 */

/**
 * All remote content plugin configurations
 * Add new remote sources here as you create them
 */
const remoteContentPlugins = [
  // Community remote content sources (docs/community/)
  contributeSource,
  codeOfConductSource,
  securitySource,
  sigsSource,
  
  // Architecture remote content sources (docs/architecture/)
  architectureMainSource,
  ...componentSources,  // Spread all dynamically generated component sources
  
  // Guide remote content sources (docs/guide/)
  ...guideSources,  // Spread all dynamically generated guide sources
  
  // Usage remote content sources (docs/usage/)
  ...usageSources,  // Spread all dynamically generated usage sources
  
  // Infra Providers remote content sources (docs/infra-providers/)
  ...infraProviderSources,  // Spread all dynamically generated infra provider sources
  
  // Add more remote sources here in the appropriate section above
];

export default remoteContentPlugins; 