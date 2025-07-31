// @ts-check

// Import individual remote content sources
import contributeSource from './remote-sources/contribute.js';
import codeOfConductSource from './remote-sources/code-of-conduct.js';
import securitySource from './remote-sources/security.js';
import sigsSource from './remote-sources/sigs.js';

// Import architecture remote content sources
import architectureMainSource from './remote-sources/architecture-main.js';
import componentSources from './remote-sources/components-generator.js';

// Import guide remote content sources
import guideExamplesSource from './remote-sources/guide-examples.js';
import guidePrerequisitesSource from './remote-sources/guide-prerequisites.js';
import guideInferenceSchedulingSource from './remote-sources/guide-inference-scheduling.js';
import guidePdDisaggregationSource from './remote-sources/guide-pd-disaggregation.js';
import guideWideEpLwsSource from './remote-sources/guide-wide-ep-lws.js';

/**
 * Remote Content Plugin System
 * 
 * This module is completely independent from other Docusaurus plugins.
 * It only manages remote content sources and can scale independently.
 * 
 * To add new remote content:
 * 1. Create a new file in remote-sources/
 * 2. Import it below
 * 3. Add it to the remoteContentPlugins array
 * 
 * Users can manage their own plugins separately in docusaurus.config.js
 */

/**
 * All remote content plugin configurations
 * Add new remote sources here as you create them
 */
const remoteContentPlugins = [
  contributeSource,
  codeOfConductSource,
  securitySource,
  sigsSource,
  
  // Architecture remote content sources
  architectureMainSource,
  ...componentSources,  // Spread all dynamically generated component sources
  
  // Guide remote content sources
  guideExamplesSource,
  guidePrerequisitesSource,
  guideInferenceSchedulingSource,
  guidePdDisaggregationSource,
  guideWideEpLwsSource,
  
  // Add more remote sources here
];

export default remoteContentPlugins; 