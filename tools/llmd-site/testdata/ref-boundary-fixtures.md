Fixture list for the ref-boundary contract. The Go scanner
(internal/srcrefs.linkRE) and the bake script (scripts/bake-docs.mjs
LLMD_LINK) are both run over this file; they must agree on where every ref
ends. Add a line here when either boundary changes.

llm-d-router is listed in the test's ref map; llm-d-benchmark is not.

1  plain path            https://github.com/llm-d/llm-d-router/tree/main/pkg/epp
2  markdown link         [x](https://github.com/llm-d/llm-d-router/tree/main/pkg)
3  bare, end of clause   see https://github.com/llm-d/llm-d-router/tree/main.
4  bare, comma           see https://github.com/llm-d/llm-d-router/tree/main, and on
5  bare, semicolon       see https://github.com/llm-d/llm-d-router/tree/main; next
6  bare, colon           see https://github.com/llm-d/llm-d-router/tree/main: next
7  bare, pipe            | https://github.com/llm-d/llm-d-router/tree/main | cell |
8  bold wrapped          **https://github.com/llm-d/llm-d-router/tree/main**
9  paren then period     (see https://github.com/llm-d/llm-d-router/tree/main.)
10 autolink              <https://github.com/llm-d/llm-d-router/tree/main>
11 single quoted         <a href='https://github.com/llm-d/llm-d-router/tree/main'>x</a>
12 backticked            `https://github.com/llm-d/llm-d-router/tree/main`
13 reference definition  [r]: https://github.com/llm-d/llm-d-router/tree/main
14 path then period      https://github.com/llm-d/llm-d-router/tree/main/pkg/epp.
15 blob with extension   https://github.com/llm-d/llm-d-router/blob/main/README.md
16 raw kind              https://github.com/llm-d/llm-d-router/raw/main/x.yaml
17 mutable minor tag     https://github.com/llm-d/llm-d-router/tree/v0.10/pkg
18 branch-style ref      https://github.com/llm-d/llm-d-router/tree/release-0.9/pkg
19 ref from another rel  https://github.com/llm-d/llm-d-router/tree/v0.9.0/pkg
20 already correct       https://github.com/llm-d/llm-d-router/tree/v0.11.0/pkg
21 unlisted, immutable   https://github.com/llm-d/llm-d-benchmark/tree/v0.5.0/config_explorer
22 other org, untouched  https://github.com/kubernetes-sigs/gateway-api/tree/main/apix
