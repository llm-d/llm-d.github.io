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
        {
          type: 'category',
          label: 'Optimized Baseline',
          link: {type: 'doc', id: 'guides/optimized-baseline/index'},
          items: [],
        },
        {
          type: 'category',
          label: 'Precise Prefix Cache Aware',
          link: {type: 'doc', id: 'guides/precise-prefix-cache-aware/index'},
          items: [],
        },
        {
          type: 'category',
          label: 'Tiered Prefix Cache',
          link: {type: 'doc', id: 'guides/tiered-prefix-cache/index'},
          items: [
            'guides/tiered-prefix-cache/cpu/index',
            {
              type: 'category',
              label: 'Storage Offloading',
              link: {type: 'doc', id: 'guides/tiered-prefix-cache/storage/index'},
              items: [
                'guides/tiered-prefix-cache/storage/manifests/backends/lustre/index',
                'guides/tiered-prefix-cache/storage/manifests/backends/aws/index',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Asynchronous Processing',
          link: {type: 'doc', id: 'guides/asynchronous-processing/index'},
          items: [
            'guides/asynchronous-processing/gcp-pubsub/index',
            'guides/asynchronous-processing/redis/index',
          ],
        },
        {
          type: 'category',
          label: 'Flow Control',
          link: {type: 'doc', id: 'guides/flow-control/index'},
          items: [],
        },
        {
          type: 'category',
          label: 'Prefill/Decode Disaggregation',
          link: {type: 'doc', id: 'guides/pd-disaggregation/index'},
          items: [],
        },
        'guides/predicted-latency-based-scheduling/index',
        {
          type: 'category',
          label: 'Wide Expert Parallelism',
          link: {type: 'doc', id: 'guides/wide-ep-lws/index'},
          items: [
            {
              type: 'category',
              label: 'Experimental DP-Aware',
              link: {type: 'doc', id: 'guides/wide-ep-lws/experimental-dp-aware/index'},
              items: [
                'guides/wide-ep-lws/experimental-dp-aware/benchmarks/index',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Workload Autoscaling',
          link: {type: 'doc', id: 'guides/workload-autoscaling/index'},
          items: [],
        },
        'guides/batch-gateway/index',
        {
          type: 'category',
          label: 'Recipes',
          items: [
            'guides/recipes/gateway/index',
            'guides/recipes/scheduler/index',
            'guides/recipes/modelserver/components/disable-gke-nccl-tuner-patch/index',
          ],
        },
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
        {
          type: 'category',
          label: 'Monitoring',
          collapsed: false,
          items: [
            'resources/monitoring/metrics',
            'resources/monitoring/tracing',
          ],
        },
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
