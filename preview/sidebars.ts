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
      link: {type: 'doc', id: 'architecture/index'},
      items: [
        {
          type: 'category',
          label: 'Core',
          collapsed: false,
          items: [
            'architecture/core/proxy',
            'architecture/core/inferencepool',
            {
              type: 'category',
              label: 'EPP',
              link: {type: 'doc', id: 'architecture/core/epp/index'},
              items: [
                'architecture/core/epp/scheduling',
                'architecture/core/epp/flow-control',
                'architecture/core/epp/request-handling',
                'architecture/core/epp/configuration',
                'architecture/core/epp/datalayer',
              ],
            },
            'architecture/core/model-servers',
          ],
        },
        {
          type: 'category',
          label: 'Advanced',
          items: [
            {
              type: 'category',
              label: 'Disaggregation',
              link: {type: 'doc', id: 'architecture/advanced/disaggregation/index'},
              items: [
                'architecture/advanced/disaggregation/configuration',
                'architecture/advanced/disaggregation/operations-vllm',
              ],
            },
            'architecture/advanced/kv-indexer',
            'architecture/advanced/kv-offloading',
            'architecture/advanced/latency-predictor',
            {
              type: 'category',
              label: 'Autoscaling',
              link: {type: 'doc', id: 'architecture/advanced/autoscaling/index'},
              items: [
                'architecture/advanced/autoscaling/workload-variant-autoscaling',
                'architecture/advanced/autoscaling/igw-hpa',
              ],
            },
            {
              type: 'category',
              label: 'Batch Processing',
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
    // ==================== Guides ====================
    {
      type: 'category',
      label: 'Guides',
      link: {type: 'doc', id: 'guides/index'},
      label: 'Guides',
      link: {type: 'doc', id: 'guides/index'},
      items: [
        'guides/intelligent-inference-scheduling',
        'guides/flow-control',
        'guides/kv-cache-management',
        'guides/pd-disaggregation',
        'guides/wide-expert-parallelism',
        {
          type: 'category',
          label: 'Experimental',
          label: 'Experimental',
          items: [
            'guides/experimental/predicted-latency',
          ],
        },
      ],
    },
    // ==================== Resources ====================
    // ==================== Resources ====================
    {
      type: 'category',
      label: 'Resources',
      label: 'Resources',
      items: [
        {
          type: 'category',
          label: 'Gateway',
          link: {type: 'doc', id: 'resources/gateway/index'},
          link: {type: 'doc', id: 'resources/gateway/index'},
          items: [
            'resources/gateway/istio',
            'resources/gateway/gke',
            'resources/gateway/agentgateway',
            'resources/gateway/istio',
            'resources/gateway/gke',
            'resources/gateway/agentgateway',
          ],
        },
        'resources/configuring-user-facing-apis',
        'resources/configuring-user-facing-apis',
        {
          type: 'category',
          label: 'Monitoring',
          items: [
            'resources/monitoring/metrics',
            'resources/monitoring/tracing',
            'resources/monitoring/metrics',
            'resources/monitoring/tracing',
          ],
        },
        'resources/deploying-multiple-models',
        'resources/profiling',
        'resources/rdma/rdma-configuration',
      ],
    },
    // ==================== API Reference ====================
    {
      type: 'category',
      label: 'API Reference',
      link: {type: 'doc', id: 'api-reference/index'},
      items: [
        'api-reference/glossary',
      ],
    },
  ],
};

export default sidebars;
