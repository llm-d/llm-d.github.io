---
sidebar_position: 2
---

# Distributed KV-Cache: KVCache Manager
Pluggable KVCache Manager for KVCache Aware Routing in vLLM-based serving platforms.
At the current stage, this repo implements an indexer module and not a standalone service.

High level slides can be found at [KVCache Manager](https://ibm-my.sharepoint.com/:p:/p/maroon_ayoub/EY0bqkkWsPtOjRguwX6FMNMB8gfzUP9wMvLEsv3OmUNX5g?e=x8xvLQ).

## Overview

The code defines a [KVCacheIndexer](pkg/kv-cache/indexer.go) module that efficiently maintains a global view of KVCache states and localities. 
In the current state of vLLM, the only available information on KVCache availability is that of the offloaded tensors to KVCache Engines via the Connector API.

The `kvcache.Indexer` module is a pluggable Go package designed for use by orchestrators to enable KVCache-aware scheduling decisions. It will soon also be deployable as a gRPC server.

```mermaid
graph 
  subgraph Cluster
    Router
    subgraph KVCacheManager[KVCache Manager]
      KVCacheIndexer[KVCache Indexer]
      PrefixStore[LRU Prefix Store]
      KVBlockToPodIndex[KVBlock to Pod availability Index]
    end
    subgraph vLLMNode[vLLM Node]
      vLLMCore[vLLM Core]
      KVCacheEngine["KVCache Engine (LMCache)"]
    end
    Redis
  end

  Router -->|"Score(prompt, ModelName, relevantPods)"| KVCacheIndexer
  KVCacheIndexer -->|"{Pod to Scores map}"| Router
  Router -->|Route| vLLMNode
  
  KVCacheIndexer -->|"FindLongestTokenizedPrefix(prompt, ModelName) -> tokens"| PrefixStore
  PrefixStore -->|"DigestPromptAsync"| PrefixStore
  KVCacheIndexer -->|"GetPodsForKeys(tokens) -> {KVBlock keys to Pods} availability map"| KVBlockToPodIndex
  KVBlockToPodIndex -->|"Redis MGet(blockKeys) -> {KVBlock keys to Pods}"| Redis

  vLLMCore -->|Connector API| KVCacheEngine
  KVCacheEngine -->|"UpdateIndex(KVBlock keys, nodeIP)"| Redis
```
This overview greatly simplifies the actual architecture and combines steps across several submodules.
For a detailed architecture, refer to the [architecture](docs/architecture.md) document.

Disclaimer: currently, this module relies on vLLM/LMCache image: `lmcache/vllm-openai:2025-03-10`. Refer to [this chart](vllm-setup-helm) for deploying.
## Examples

- [KVCache Indexer](examples/kvcache-indexer/README.md): 
  - A reference implementation of using the KVCacheIndex module.
- [KVCache Aware Scorer](examples/kv-cache-aware-scorer/README.md): 
  - A reference implementation of integrating the KVCacheIndex module in an inference-gateway based router with `Scorers`.
