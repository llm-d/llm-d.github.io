import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// Sidebar structure matching docs/wip-docs-new/outline.md exactly
const sidebars: SidebarsConfig = {
  docsSidebar: [
    // ==================== Introduction (standalone) ====================
    {type: 'doc', id: 'getting-started/index', label: 'Introduction to llm-d'},
    // ==================== Getting Started ====================
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/quickstart',
        {type: 'doc', id: 'getting-started/accelerators', label: 'Supported Accelerators'},
      ],
    },
    // ==================== Well-Lit Paths ====================
    {
      type: 'category',
      label: 'Well-Lit Paths',
      collapsed: false,
      link: {type: 'doc', id: 'guides/index'},
      items: [
        {
          type: 'category',
          label: 'Foundations',
          collapsed: false,
          link: {type: 'doc', id: 'guides/capabilities'},
          items: [
            {type: 'doc', id: 'guides/optimized-baseline', label: 'Deploy an Optimized Baseline'},
            {type: 'doc', id: 'guides/predicted-latency', label: 'Route Requests by Predicted Latency'},
            {type: 'doc', id: 'guides/precise-prefix-cache-routing', label: 'Enable Precise Prefix-Cache Aware Routing'},
            {type: 'doc', id: 'guides/tiered-prefix-cache', label: 'Configure a Tiered Prefix Cache'},
            {type: 'doc', id: 'guides/pd-disaggregation', label: 'Deploy Prefill/Decode Disaggregation'},
            {type: 'doc', id: 'guides/wide-expert-parallelism', label: 'Scale MoE Models with Wide Expert Parallelism'},
          ],
        },
        {
          type: 'category',
          label: 'Workloads',
          collapsed: false,
          link: {type: 'doc', id: 'guides/workloads'},
          items: [
            {type: 'doc', id: 'guides/agentic-serving/index', label: 'Serve Agentic Workloads'},
            {type: 'doc', id: 'guides/multimodal-serving', label: 'Serve Multimodal Workloads'},
            {
              type: 'category',
              label: 'Serve Batch Workloads',
              collapsed: true,
              items: [
                {type: 'doc', id: 'guides/asynchronous-processing', label: 'Asynchronous Processing'},
                {type: 'doc', id: 'guides/batch-gateway', label: 'Batch Gateway'},
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Traffic Control & Autoscaling',
          collapsed: false,
          link: {type: 'doc', id: 'guides/traffic-control'},
          items: [
            {type: 'doc', id: 'guides/flow-control', label: 'Apply Flow Control and Fairness'},
            {type: 'doc', id: 'guides/workload-autoscaling', label: 'Autoscale your Inference Pool'},
          ],
        },
      ],
    },
    // ==================== Concepts (Architecture) ====================
    {
      type: 'category',
      label: 'Concepts (Architecture)',
      collapsed: true,
      link: {type: 'doc', id: 'architecture/index'},
      items: [
        {
          type: 'category',
          label: 'Core',
          collapsed: true,
          items: [
            'architecture/core/inferencepool',
            {
              type: 'category',
              label: 'Router',
              link: {type: 'doc', id: 'architecture/core/router/index'},
              items: [
                'architecture/core/router/proxy',
                {
                  type: 'category',
                  label: 'EPP',
                  link: {type: 'doc', id: 'architecture/core/router/epp/index'},
                  items: [
                    'architecture/core/router/epp/request-handling',
                    'architecture/core/router/epp/flow-control',
                    'architecture/core/router/epp/scheduling',
                    'architecture/core/router/epp/datalayer',
                    'architecture/core/router/epp/configuration',
                  ],
                },
              ],
            },
            'architecture/core/model-servers',
          ],
        },
        {
          type: 'category',
          label: 'Capabilities',
          collapsed: true,
          items: [
            {
              type: 'category',
              label: 'Disaggregation',
              collapsed: true,
              link: {type: 'doc', id: 'architecture/advanced/disaggregation/index'},
              items: [
                'architecture/advanced/disaggregation/operations-vllm',
                'architecture/advanced/disaggregation/operations-sglang',
              ],
            },
            'architecture/advanced/latency-predictor',
            {
              type: 'category',
              label: 'KV Cache Management',
              collapsed: true,
              link: {type: 'doc', id: 'architecture/advanced/kv-management/index'},
              items: [
                'architecture/advanced/kv-management/prefix-cache-aware-routing',
                'architecture/advanced/kv-management/kv-indexer',
                'architecture/advanced/kv-management/kv-offloader',
              ],
            },
            {
              type: 'category',
              label: 'Autoscaling',
              collapsed: true,
              link: {type: 'doc', id: 'architecture/advanced/autoscaling/index'},
              items: [
                'architecture/advanced/autoscaling/workload-variant-autoscaling',
                {type: 'doc', id: 'architecture/advanced/autoscaling/igw-hpa', label: 'EndPoint Picker HPA/KEDA Integration'},
              ],
            },
            {
              type: 'category',
              label: 'Batch Processing',
              collapsed: true,
              link: {type: 'doc', id: 'architecture/advanced/batch/index'},
              items: [
                'architecture/advanced/batch/batch-gateway',
                'architecture/advanced/batch/async-processor',
              ],
            },
          ],
        },
      ],
    },
    // ==================== Operations ====================
    {
      type: 'category',
      label: 'Operations & Monitoring',
      collapsed: true,
      items: [
        {type: 'doc', id: 'resources/observability/metrics', label: 'Monitoring & Metrics'},
        {type: 'doc', id: 'resources/observability/tracing', label: 'Tracing'},
        {type: 'doc', id: 'resources/observability/promql', label: 'PromQL'},
        {type: 'doc', id: 'resources/operations/readiness-probes', label: 'Readiness Probes'},
        {type: 'doc', id: 'resources/operations/rollouts/index', label: 'Rollouts'},
        {type: 'doc', id: 'resources/operations/router', label: 'Router Operations Guide'},
      ],
    },
    // ==================== Infrastructure & Environments ====================
    {
      type: 'category',
      label: 'Infrastructure & Environments',
      collapsed: true,
      // Render the Infrastructure Reference content on the section page itself
      // instead of as a separate child entry.
      link: {type: 'doc', id: 'resources/infrastructure/index'},
      items: [
        {
          type: 'category',
          label: 'Kubernetes Infrastructure Providers',
          collapsed: true,
          link: {type: 'doc', id: 'resources/infra-providers/index'},
          items: [
            'resources/infra-providers/aks',
            'resources/infra-providers/digitalocean',
            'resources/infra-providers/gke',
            'resources/infra-providers/minikube',
            'resources/infra-providers/openshift',
            'resources/infra-providers/openshift-aws',
          ],
        },
        {
          type: 'category',
          label: 'Kubernetes Gateways',
          collapsed: true,
          link: {type: 'doc', id: 'resources/gateway/index'},
          items: [
            'resources/gateway/istio',
            'resources/gateway/gke',
            'resources/gateway/agentgateway',
          ],
        },
        {type: 'doc', id: 'resources/infrastructure/multi-node', label: 'Kubernetes Multi-Node Orchestration'},
        {type: 'doc', id: 'resources/infrastructure/no-kubernetes-deployment', label: 'Non-K8s & Bare-Metal Deployments'},
        {type: 'doc', id: 'resources/rdma/rdma-configuration', label: 'RDMA & Networking Configuration'},
      ],
    },
    // ==================== References ====================
    {
      type: 'category',
      label: 'References',
      collapsed: true,
      link: {type: 'doc', id: 'api-reference/index'},
      items: [
        {
          type: 'category',
          label: 'Kubernetes APIs',
          collapsed: true,
          items: [
            {type: 'doc', id: 'api-reference/inferencepool', label: 'InferencePool'},
            {type: 'doc', id: 'api-reference/inferenceobjective', label: 'InferenceObjective'},
            {type: 'doc', id: 'api-reference/inferencemodelrewrite', label: 'InferenceModelRewrite'},
          ],
        },
        {type: 'doc', id: 'api-reference/endpointpickerconfig', label: 'Component Config: EndpointPickerConfig'},
        {type: 'doc', id: 'api-reference/epp-http-apis', label: 'HTTP APIs'},
        {type: 'doc', id: 'api-reference/epp-grpc-apis', label: 'RPC APIs'},
        {type: 'doc', id: 'api-reference/epp-http-headers', label: 'HTTP Headers'},
        {type: 'doc', id: 'api-reference/glossary', label: 'Glossary'},
        {type: 'doc', id: 'api-reference/artifacts', label: 'Artifacts'},
      ],
    },
  ],
};

export default sidebars;
