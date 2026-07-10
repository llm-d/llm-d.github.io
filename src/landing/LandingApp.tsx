import { useEffect, useRef } from "react";
import Frame48 from "./Frame156";

/**
 * LandingApp — the ported landing page (Frame48) plus the design's animations
 * (shimmer on purple headline spans, fade-up on section blocks, hover
 * transitions). The `.llmd-frame` wrapper scopes the generated Tailwind
 * utilities (landing.tailwind.css) so nothing leaks into the rest of the site;
 * `body.llmd-landing` scopes the landing-only navbar/footer chrome.
 */
export default function LandingApp() {
  const frameRef = useRef<HTMLDivElement>(null);

  // Landing-only body class (navbar color + hide Docusaurus footer).
  useEffect(() => {
    document.body.classList.add("llmd-landing");
    return () => document.body.classList.remove("llmd-landing");
  }, []);

  useEffect(() => {
    if (!frameRef.current) return;

    // Shimmer: add class when purple spans enter viewport.
    const spans = frameRef.current.querySelectorAll<HTMLElement>(
      "span.text-\\[\\#7f317f\\]"
    );
    const shimmerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("llmd-shimmer");
          }
        });
      },
      { threshold: 0.5 }
    );
    spans.forEach((span) => shimmerObserver.observe(span));

    // Fade-up: add visible class when section blocks enter viewport.
    const sections = frameRef.current.querySelectorAll<HTMLElement>(
      ".llmd-content > div > div > div"
    );
    sections.forEach((el) => el.classList.add("llmd-fade-up"));

    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("llmd-visible");
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    sections.forEach((el) => fadeObserver.observe(el));

    return () => {
      shimmerObserver.disconnect();
      fadeObserver.disconnect();
    };
  }, []);

  // Two layout modes, toggled by viewport width:
  //   • Desktop (≥ DESKTOP_MIN): the design renders at its native 922px width as
  //     an absolutely-positioned, centered column. Because it's absolute, the
  //     wrapper has no intrinsic height, so we measure the column and pin the
  //     wrapper's min-height to it.
  //   • Below that: the `llmd-mobile` class puts the column back into normal
  //     flow at full width (see landing.css) and CSS reflows each section
  //     (single-column stack, 2-wide card grids, larger type, side padding).
  //     In flow the wrapper auto-heights, so no measurement is needed.
  // Keeping the native design above a real tablet width (rather than scaling it
  // down) is what keeps text legible on phones/tablets.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const content = frame.querySelector<HTMLElement>(".llmd-content");
    if (!content) return;
    const DESKTOP_MIN = 940;
    const sync = () => {
      const vw = document.documentElement.clientWidth;
      // Clear any stale inline positioning from a previous mode.
      content.style.transform = "";
      content.style.left = "";
      content.style.transformOrigin = "";
      if (vw >= DESKTOP_MIN) {
        frame.classList.remove("llmd-mobile");
        frame.style.minHeight = `${content.offsetHeight}px`;
        // Hero grey band should end at the vertical midpoint of the stat cards
        // (they straddle grey→white). Expose half the stat-row height as a CSS
        // var; landing.css uses it for the negative margin + next-section pad.
        const stats = frame.querySelector<HTMLElement>(".llmd-grid-stats");
        frame.style.setProperty(
          "--llmd-stats-overhang",
          stats ? `${stats.offsetHeight / 2}px` : "0px"
        );
      } else {
        frame.classList.add("llmd-mobile");
        frame.style.minHeight = "";
        frame.style.setProperty("--llmd-stats-overhang", "0px");
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(content);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <>
      <style>{`
        /* Filled purple buttons */
        div.bg-\\[\\#7f317f\\].rounded-\\[8px\\] {
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        div.bg-\\[\\#7f317f\\].rounded-\\[8px\\]:hover {
          background-color: #5e2460;
          transform: translateY(-2px);
        }

        /* Outlined button (Explore the performance data) */
        div.rounded-\\[8px\\][class*="px-"][class*="justify-center"]:not([class*="bg-"]) {
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        div.rounded-\\[8px\\][class*="px-"][class*="justify-center"]:not([class*="bg-"]):hover {
          background-color: rgba(127, 49, 127, 0.08);
          transform: translateY(-2px);
        }

        /* Card "Get started" text links */
        p.text-\\[\\#7f317f\\] {
          cursor: pointer;
          transition: color 0.2s ease;
          text-decoration: none;
        }
        p.text-\\[\\#7f317f\\]:hover {
          color: #5e2460;
          text-decoration: none;
        }

        /* Release updates card — no hover flip (targeted by its stable class). */
        div.llmd-release-card {
          cursor: default !important;
          transition: none !important;
        }
        div.llmd-release-card:hover {
          background-color: #f2f4f8 !important;
        }

        /* Well-Lit path cards */
        div.bg-\\[\\#f2f4f8\\].rounded-\\[8px\\] {
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        div.bg-\\[\\#f2f4f8\\].rounded-\\[8px\\]:hover {
          background-color: #DDE1E6;
        }
        div.bg-\\[\\#f2f4f8\\].rounded-\\[8px\\]:hover > div.border-\\[\\#dde1e6\\] {
          border-color: #C1C7CD;
        }

        /* Hardware section card borders */
        div.aspect-\\[920\\/307\\] div.border-\\[\\#f2f4f8\\] {
          border-color: #4D5358 !important;
        }

        /* Stat cards: lift up 24px on hover */
        div.aspect-\\[3\\/4\\] {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        div.aspect-\\[3\\/4\\]:hover {
          transform: translateY(-24px);
        }

        /* Visible scrollbar on the release commit list. */
        .llmd-commit-scroll {
          scrollbar-gutter: stable;
        }
        .llmd-commit-scroll::-webkit-scrollbar {
          width: 8px;
          -webkit-appearance: none;
        }
        .llmd-commit-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .llmd-commit-scroll::-webkit-scrollbar-thumb {
          background: #c1c7cd;
          border-radius: 4px;
        }
        .llmd-commit-scroll::-webkit-scrollbar-thumb:hover {
          background: #a2a9b0;
        }

        /* Fade-up: hidden until in view */
        .llmd-fade-up {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .llmd-fade-up.llmd-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes llmd-shimmer {
          0% {
            background-position: 120% center;
            animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          }
          50% {
            background-position: -20% center;
            animation-timing-function: step-start;
          }
          50.01% {
            background-position: 120% center;
            animation-timing-function: linear;
          }
          100% {
            background-position: 120% center;
          }
        }
        .llmd-shimmer {
          background: linear-gradient(
            90deg,
            #7f317f 30%,
            #c078c0 50%,
            #7f317f 70%
          );
          background-size: 200% 100%;
          background-position: 120% center;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: llmd-shimmer 6s linear infinite;
        }
      `}</style>
      <div ref={frameRef} className="llmd-frame">
        <Frame48 />
      </div>
    </>
  );
}
