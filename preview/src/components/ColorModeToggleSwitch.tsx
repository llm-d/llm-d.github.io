import React from 'react';
import {useColorMode} from '@docusaurus/theme-common';
import {Moon, Sun} from 'lucide-react';

export default function ColorModeToggleSwitch(): React.JSX.Element {
  const {colorMode, setColorMode} = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className="color-toggle"
      data-state={isDark ? 'dark' : 'light'}
      onClick={() => setColorMode(isDark ? 'light' : 'dark')}
    >
      <span className="color-toggle__track" aria-hidden="true">
        <span className="color-toggle__thumb">
          {isDark ? <Moon size={11} /> : <Sun size={11} />}
        </span>
      </span>
    </button>
  );
}
