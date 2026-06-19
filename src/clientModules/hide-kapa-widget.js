// Toggle a body class on /blog/* and /community/* routes so the Kapa.ai
// Ask-AI widget (appended to <body>, outside the route wrappers) can be
// hidden via CSS on those pages. Kept enabled on the landing page only.
function shouldHide() {
  const p = window.location.pathname;
  return p.startsWith('/blog') || p.startsWith('/community');
}

function sync() {
  document.body.classList.toggle('hide-kapa-widget', shouldHide());
}

if (typeof window !== 'undefined') {
  // First paint
  if (document.body) {
    sync();
  } else {
    document.addEventListener('DOMContentLoaded', sync);
  }

  // SPA navigation — pushState / replaceState don't fire popstate, so wrap them
  const wrap = (method) => {
    const orig = history[method];
    history[method] = function (...args) {
      const ret = orig.apply(this, args);
      sync();
      return ret;
    };
  };
  wrap('pushState');
  wrap('replaceState');
  window.addEventListener('popstate', sync);
}

export default {};
