import React, {useRef, useCallback, useState, useEffect} from 'react';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {HighlightSearchResults} from './shared/HighlightSearchResults';
import {navigateToSearchResult} from './resolveSearchUrl';

// Unified index is built at the site root by scripts/merge-search-index.mjs
const UNIFIED_SEARCH_DOC = '/search-doc.json';
const UNIFIED_LUNR_INDEX = '/lunr-index.json';

const Search = (props) => {
  const initialized = useRef(false);
  const searchBarRef = useRef(null);
  const [indexReady, setIndexReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const isBrowser = useIsBrowser();

  const initAlgolia = (searchDocs, searchIndex, DocSearch, options) => {
    new DocSearch({
      searchDocs,
      searchIndex,
      baseUrl: '/',
      inputSelector: '#search_input_react',
      handleSelected: (_input, _event, suggestion) => {
        const url = suggestion.url || '/';
        _input.setVal('');
        _event.target.blur();

        let wordToHighlight = '';
        if (options.highlightResult) {
          try {
            const matchedLine =
              suggestion.text || suggestion.subcategory || suggestion.title;
            const matchedWordResult = matchedLine.match(
              new RegExp('<span.+span>\\w*', 'g'),
            );
            if (matchedWordResult && matchedWordResult.length > 0) {
              const tempDoc = document.createElement('div');
              tempDoc.innerHTML = matchedWordResult[0];
              wordToHighlight = tempDoc.textContent;
            }
          } catch (e) {
            console.error('Failed to extract highlight word:', e);
          }
        }

        if (url.startsWith('/docs')) {
          navigateToSearchResult(url);
        } else {
          window.location.assign(url);
        }
      },
      maxHits: options.maxHits,
    });
  };

  const getSearchDoc = () =>
    process.env.NODE_ENV === 'production'
      ? fetch(UNIFIED_SEARCH_DOC)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load search index: ${response.status}`);
            }
            return response.json();
          })
          .catch((error) => {
            console.error('Search index loading failed:', error);
            setLoadError(true);
            return {searchDocs: [], options: {}};
          })
      : Promise.resolve({});

  const getLunrIndex = () =>
    process.env.NODE_ENV === 'production'
      ? fetch(UNIFIED_LUNR_INDEX)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load lunr index: ${response.status}`);
            }
            return response.json();
          })
          .catch((error) => {
            console.error('Lunr index loading failed:', error);
            setLoadError(true);
            return [];
          })
      : Promise.resolve([]);

  const loadAlgolia = () => {
    if (!initialized.current) {
      Promise.all([
        getSearchDoc(),
        getLunrIndex(),
        import('./shared/DocSearch'),
        import('./shared/algolia.css'),
      ]).then(([searchDocFile, searchIndex, {default: DocSearch}]) => {
        const {searchDocs, options} = searchDocFile;
        if (!searchDocs || searchDocs.length === 0) {
          return;
        }
        initAlgolia(searchDocs, searchIndex, DocSearch, options);
        setIndexReady(true);
      });
      initialized.current = true;
    }
  };

  const toggleSearchIconClick = useCallback(
    (e) => {
      if (!searchBarRef.current.contains(e.target)) {
        searchBarRef.current.focus();
      }

      props.handleSearchBarToggle &&
        props.handleSearchBarToggle(!props.isSearchBarExpanded);
    },
    [props.isSearchBarExpanded],
  );

  const handleSearchIconKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') {
        return;
      }
      e.preventDefault();
      toggleSearchIconClick(e);
    },
    [toggleSearchIconClick],
  );

  let placeholder;
  if (isBrowser) {
    loadAlgolia();
    placeholder = window.navigator.platform.startsWith('Mac')
      ? 'Search ⌘+K'
      : 'Search Ctrl+K';
  }

  useEffect(() => {
    if (props.autoFocus && indexReady) {
      searchBarRef.current.focus();
    }
  }, [indexReady]);

  return (
    <div className="navbar__search" key="search-box">
      <span
        aria-label="expand searchbar"
        role="button"
        className={clsx('search-icon', {
          'search-icon-hidden': props.isSearchBarExpanded,
        })}
        onClick={toggleSearchIconClick}
        onKeyDown={handleSearchIconKeyDown}
        tabIndex={0}
      />
      <input
        id="search_input_react"
        type="search"
        placeholder={loadError ? 'Search unavailable' : (indexReady ? placeholder : 'Loading...')}
        aria-label="Search"
        className={clsx(
          'navbar__search-input',
          {'search-bar-expanded': props.isSearchBarExpanded},
          {'search-bar': !props.isSearchBarExpanded},
        )}
        onClick={loadAlgolia}
        onMouseOver={loadAlgolia}
        onFocus={toggleSearchIconClick}
        onBlur={toggleSearchIconClick}
        ref={searchBarRef}
        disabled={!indexReady}
      />
      <HighlightSearchResults />
    </div>
  );
};

export default Search;
