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
              ],
            },
            'architecture/core/model-servers',
          ],
        },
        {
          type: 'category',
          label: 'Advanced',
          items: [
            'architecture/advanced/disaggregation',
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
          ],
        },
      ],
    },
    // ==================== Well-Lit Paths ====================
    {
      type: 'category',
      label: 'Well-Lit Paths',
      link: {type: 'doc', id: 'well-lit-paths/index'},
      items: [
        {
          type: 'category',
          label: 'Intelligent Inference Scheduling',
          link: {type: 'doc', id: 'well-lit-paths/intelligent-inference-scheduling/index'},
          items: [
            'well-lit-paths/intelligent-inference-scheduling/default',
            'well-lit-paths/intelligent-inference-scheduling/precise-prefix-cache-aware-routing',
            'well-lit-paths/intelligent-inference-scheduling/predicted-latency',
            'well-lit-paths/intelligent-inference-scheduling/flow-control',
          ],
        },
        'well-lit-paths/prefill-decode-disaggregation',
        'well-lit-paths/wide-expert-parallelism',
        'well-lit-paths/tiered-prefix-cache',
        'well-lit-paths/workload-autoscaling',
      ],
    },
    // ==================== User Guides ====================
    {
      type: 'category',
      label: 'User Guides',
      items: [
        {
          type: 'category',
          label: 'Gateway',
          link: {type: 'doc', id: 'user-guides/gateway/index'},
          items: [
            'user-guides/gateway/istio',
            'user-guides/gateway/gke',
            'user-guides/gateway/agentgateway',
          ],
        },
        'user-guides/configuring-user-facing-apis',
        {
          type: 'category',
          label: 'Monitoring',
          items: [
            'user-guides/monitoring/metrics',
            'user-guides/monitoring/tracing',
          ],
        },
        'user-guides/deploying-multiple-models',
        'user-guides/rdma-configuration',
      ],
    },
    // ==================== API Reference ====================
    {
      type: 'category',
      label: 'API Reference',
      link: {type: 'doc', id: 'api-reference/index'},
      items: [],
    },
  ],
};

export default sidebars;
