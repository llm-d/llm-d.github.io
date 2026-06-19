import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// Sidebar structure matching docs/wip-docs-new/outline.md exactly
const sidebars: SidebarsConfig = {
  docsSidebar: [
    // Standalone landing/intro — kept top-level so it doesn't auto-expand
    // the Getting Started category when active.
    {type: 'doc', id: 'getting-started/index', label: 'Intro to llm-d'},
    // ==================== Getting Started ====================
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/quickstart',
        'getting-started/artifacts',
      ],
    },
    // ==================== Well-Lit Paths ====================
    {
      type: 'category',
      label: 'Well-Lit Paths',
      collapsed: false,
      link: {type: 'doc', id: 'guides/index'},
      items: [
        'guides/optimized-baseline',
        'guides/precise-prefix-cache-routing',
        'guides/tiered-prefix-cache',
        'guides/asynchronous-processing',
        'guides/flow-control',
        'guides/pd-disaggregation',
        'guides/predicted-latency',
        'guides/wide-expert-parallelism',
        'guides/workload-autoscaling',
        'guides/no-kubernetes-deployment',
      ],
    },
    // ==================== Architecture ====================
    {
      type: 'category',
      label: 'Architecture',
      collapsed: true,
      link: {type: 'doc', id: 'architecture/index'},
      items: [
        {
          type: 'category',
          label: 'Core',
          collapsed: false,
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
          label: 'Advanced',
          collapsed: false,
          items: [
            {
              type: 'category',
              label: 'Disaggregation',
              collapsed: false,
              link: {type: 'doc', id: 'architecture/advanced/disaggregation/index'},
              items: [
                'architecture/advanced/disaggregation/operations-vllm',
              ],
            },
            'architecture/advanced/latency-predictor',
            {
              type: 'category',
              label: 'KV Cache Management',
              collapsed: false,
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
              collapsed: false,
              link: {type: 'doc', id: 'architecture/advanced/autoscaling/index'},
              items: [
                'architecture/advanced/autoscaling/workload-variant-autoscaling',
                'architecture/advanced/autoscaling/igw-hpa',
              ],
            },
            {
              type: 'category',
              label: 'Batch Processing',
              collapsed: false,
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
    // ==================== Resources ====================
    {
      type: 'category',
      label: 'Resources',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Gateway',
          collapsed: false,
          link: {type: 'doc', id: 'resources/gateway/index'},
          items: [
            'resources/gateway/istio',
            'resources/gateway/gke',
            'resources/gateway/agentgateway',
          ],
        },
        {
          type: 'category',
          label: 'Infrastructure Providers',
          collapsed: false,
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
          label: 'Observability',
          collapsed: false,
          link: {type: 'doc', id: 'resources/observability/index'},
          items: [
            'resources/observability/setup',
            'resources/observability/metrics',
            'resources/observability/tracing',
            'resources/observability/promql',
          ],
        },
        'resources/rdma/rdma-configuration',
      ],
    },
    // ==================== API Reference ====================
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      link: {type: 'doc', id: 'api-reference/index'},
      items: [
        'api-reference/glossary',
      ],
    },
  ],
};

export default sidebars;
