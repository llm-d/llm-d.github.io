// @ts-check

// Import individual remote content sources
import contributeSource from './remote-sources/contribute.js';
import codeOfConductSource from './remote-sources/code-of-conduct.js';

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
  
  // Add more remote sources here
];

export default remoteContentPlugins; 