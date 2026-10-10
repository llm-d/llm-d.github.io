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

  // Follow-up guide moves: Multimodal to Foundations (llm-d/llm-d#2697),
  // Operations sub-menu refinements (llm-d/llm-d#2705), and the Models pillar
  // replacing Workloads (llm-d/llm-d#2706).
  ...[
    ['well-lit-paths/workloads/multimodal-serving', 'well-lit-paths/foundations/serve-multimodal-models'],
    ['operations/autoscaling/multi-inference-pool', 'operations/traffic/multi-inference-pool'],
    ['operations/autoscaling/wva', 'operations/autoscaling'],
    ['operations/autoscaling/prometheus-adapter', 'operations/autoscaling'],
    ['well-lit-paths/workloads', 'well-lit-paths/models'],
    ['well-lit-paths/workloads/agentic-serving', 'well-lit-paths/models'],
  ].map(([from, to]) => ({ from: `/docs/dev/${from}`, to: `/docs/dev/${to}` })),

  // Concepts reorg (llm-d/llm-d#2727).
  ...[
    ['architecture/core/router', 'architecture/router'],
    ['architecture/core/router/proxy', 'architecture/router/proxy'],
    ['architecture/core/router/epp', 'architecture/router/epp'],
    ['architecture/core/router/epp/request-handling', 'architecture/router/request-handling'],
    ['architecture/core/router/epp/flow-control', 'architecture/router/flow-control'],
    ['architecture/core/router/epp/scheduling', 'architecture/router/scheduling'],
    ['architecture/core/router/epp/datalayer', 'architecture/router/datalayer'],
    ['architecture/core/router/epp/configuration', 'architecture/router/configuration'],
    ['architecture/advanced/latency-predictor', 'architecture/router/latency-predictor'],
    ['architecture/advanced/inference-payload-processing', 'architecture/router/ipp'],
    ['architecture/core/inferencepool', 'architecture/router/inferencepool'],
    ['architecture/core/model-servers', 'architecture/model-servers'],
    ['architecture/advanced/disaggregation', 'architecture/disaggregation/pd-disaggregation'],
    ['architecture/advanced/wide-expert-parallelism', 'architecture/disaggregation/wide-expert-parallelism'],
    ['architecture/advanced/kv-management', 'architecture/kv-management'],
    ['architecture/advanced/kv-management/prefix-cache-aware-routing', 'architecture/kv-management/prefix-cache-aware-routing'],
    ['architecture/advanced/kv-management/kv-indexer', 'architecture/kv-management/kv-indexer'],
    ['architecture/advanced/kv-management/kv-offloader', 'architecture/kv-management/kv-offloader'],
    ['architecture/advanced/kv-management/p2p-kv-cache-sharing', 'architecture/kv-management/p2p-kv-cache-sharing'],
    ['architecture/advanced/autoscaling', 'architecture/autoscaling'],
    ['architecture/advanced/autoscaling/keda-epp', 'architecture/autoscaling/keda-epp'],
    ['architecture/advanced/autoscaling/slo-aware-keda', 'architecture/autoscaling/slo-aware-keda'],
    ['architecture/advanced/autoscaling/wva', 'architecture/autoscaling/wva'],
    ['architecture/advanced/batch', 'architecture/batch'],
    ['architecture/advanced/batch/batch-gateway', 'architecture/batch/batch-gateway'],
    ['architecture/advanced/batch/async-processor', 'architecture/batch/async-processor'],
    ['infrastructure/providers/gke/dynamic-slicing', 'infrastructure/providers/gke'],
  ].map(([from, to]) => ({ from: `/docs/dev/${from}`, to: `/docs/dev/${to}` })),
];

export default redirects;
