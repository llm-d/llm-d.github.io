// @ts-check
// Client-side redirects (@docusaurus/plugin-client-redirects) for site URLs
// that have moved. Each entry generates a static HTML page at `from` that
// redirects to `to`. The build fails if a `to` page does not exist.
//
// Only list paths that actually change. Released doc versions (/docs/<v>/ and
// the latest at /docs/) are frozen snapshots, so docs moves in llm-d/llm-d
// usually only need redirects under /docs/dev/.

/** @type {{from: string | string[], to: string}[]} */
const redirects = [
  // Renamed blog slugs.
  {
    from: '/blog/bottleneck-aware-scheduling-for-llm-inference',
    to: '/blog/sticky-until-saturated-token-aware-routing',
  },

  // Operations reorg (llm-d/llm-d#2691).
  ...[
    ['well-lit-paths/foundations/workload-autoscaling', 'operations/autoscaling'],
    ['well-lit-paths/foundations/fast-model-actuation', 'operations/startup/fast-model-actuation'],
    ['well-lit-paths/foundations/flow-control', 'operations/traffic/flow-control'],
    ['well-lit-paths/foundations/multi-model-routing', 'operations/traffic/multi-model-routing'],
    ['well-lit-paths/workloads/batch-serving', 'operations/batch-serving'],
    ['well-lit-paths/workloads/batch-serving/asynchronous-processing', 'operations/batch-serving/asynchronous-processing'],
    ['well-lit-paths/workloads/batch-serving/batch-gateway', 'operations/batch-serving/batch-gateway'],
    ['operations/async-processor', 'operations/components/async-processor'],
    ['operations/model-loading-and-startup', 'operations/startup/model-loading-and-startup'],
    ['operations/router', 'operations/components/router'],
    ['operations/graceful-shutdown', 'operations/lifecycle/graceful-shutdown'],
    ['operations/readiness-probes', 'operations/lifecycle/readiness-probes'],
    ['operations/serve-external-apis', 'operations/integrations'],
    ['operations/serve-external-apis/litellm', 'operations/integrations/litellm'],
    ['operations/serve-external-apis/kong', 'operations/integrations/kong'],
  ].map(([from, to]) => ({ from: `/docs/dev/${from}`, to: `/docs/dev/${to}` })),
];

export default redirects;
