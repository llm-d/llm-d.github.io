# Observability

Monitor and debug llm-d deployments with Prometheus metrics, Grafana dashboards, and OpenTelemetry distributed tracing.

:::note
Every well-lit path guide links here for observability setup. Install the stack once and reuse it across guides.
:::


## Documentation

* [Setup](/docs/resources/observability/setup) — Install Prometheus and Grafana, load dashboards, and deploy tracing backends
* [Metrics](/docs/resources/observability/metrics) — Enable and interpret model server and EPP metrics
* [Distributed Tracing](/docs/resources/observability/tracing) — Configure OpenTelemetry across vLLM, the routing proxy, and the EPP
* [PromQL Reference](/docs/resources/observability/promql) — Ready-to-use queries for dashboards and alerting

## Runnable assets

Scripts, Grafana dashboard JSON, and tracing manifests live in [`guides/recipes/observability/`](https://github.com/llm-d/llm-d/tree/release-0.8/guides/recipes/observability) in the llm-d repository (not published as website pages).
