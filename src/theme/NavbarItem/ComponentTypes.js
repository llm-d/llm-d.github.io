import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import GithubStarsNavbarItem from '@site/src/components/GithubStarsNavbarItem';

// Register the custom navbar item type used in docusaurus.config.js:
//   { type: 'custom-githubStars', ... }
export default {
  ...ComponentTypes,
  'custom-githubStars': GithubStarsNavbarItem,
};
