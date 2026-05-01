import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import VersionDropdown from '@site/src/components/VersionDropdown';
import GitHubStars from '@site/src/components/GitHubStars';
import SlackButton from '@site/src/components/SlackButton';
import ColorModeToggleSwitch from '@site/src/components/ColorModeToggleSwitch';

export default {
  ...ComponentTypes,
  'custom-version-dropdown': VersionDropdown,
  'custom-github-stars': GitHubStars,
  'custom-slack-button': SlackButton,
  'custom-color-mode-toggle': ColorModeToggleSwitch,
};
