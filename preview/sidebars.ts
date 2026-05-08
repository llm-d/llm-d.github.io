import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// Sidebar structure matching docs/wip-docs-new/outline.md exactly
const sidebars: SidebarsConfig = {
  docsSidebar: [
    // ==================== Getting Started ====================
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      link: {type: 'doc', id: 'getting-started/index'},
      items: [
        'getting-started/quickstart',
        'getting-started/feature-matrix',
        'getting-started/artifacts',
      ],
    },
    // ==================== Architecture ====================
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
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
                'architecture/advanced/disaggregation/configuration',
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
    // ==================== Guides ====================
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      link: {type: 'doc', id: 'guides/index'},
      items: [
        'guides/optimized-baseline',
        'guides/precise-prefix-cache-aware',
        'guides/tiered-prefix-cache',
        'guides/asynchronous-processing',
        'guides/flow-control',
        'guides/pd-disaggregation',
        'guides/predicted-latency',
        'guides/wide-expert-parallelism',
        'guides/workload-autoscaling',
      ],
    },
    // ==================== Resources ====================
    {
      type: 'category',
      label: 'Resources',
      collapsed: false,
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
        'resources/configuring-user-facing-apis',
        {
          type: 'category',
          label: 'Monitoring',
          collapsed: false,
          items: [
            'resources/monitoring/metrics',
            'resources/monitoring/tracing',
          ],
        },
        'resources/deploying-multiple-models',
        'resources/rollout-new-version',
        'resources/profiling',
        'resources/rdma/rdma-configuration',
      ],
    },
    // ==================== API Reference ====================
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      link: {type: 'doc', id: 'api-reference/index'},
      items: [
        'api-reference/glossary',
      ],
    },
  ],
};

export default sidebars;
