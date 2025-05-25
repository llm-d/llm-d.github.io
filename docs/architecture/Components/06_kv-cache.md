---
sidecar_position: 06
sidecar_label: KV-Cache Manager
---
# KV-Cache Manager

## Introduction

LLM inference can be computationally expensive due to the sequential nature of token generation. 
KV-caching plays a critical role in optimizing this process. By storing previously computed key and value attention vectors, 
KV-cache reuse avoids redundant computations during inference, significantly reducing latency and resource consumption. 
This is particularly beneficial for long context multi-turn conversations or Agentic (&RAG) applications where 
previously computed information can be leveraged effectively. 
Efficient KV-cache management and routing are essential for scaling LLM inference and delivering a responsive user experience.

llmd-kv-cache-manager is a pluggable KV-cache Manager for KV-cache Aware Routing in LLM serving platforms.

This initial work will expand in capacity as development continues.
 
 See the [docs folder in the repository](https://github.com/llm-d/llm-d-kv-cache-manager/blob/main/docs/README.md) for more information on goals, architecture and more.

## Goals

The KV-Cache-Manager is designed to connect high-level serving-stack goals with concrete system capabilities through a layered objective structure:

- **Improve user experience** 
  - By reducing Time-To-First-Token (TTFT)
     - Enabled through higher KVCache hit rates and reduced tensor transfers
     - Supported by smart routing and distributed cache availability
     - Optimized by proactive pre-placement of hot caches and session duplication/migration
- **Reduce serving costs**
  - By improving compute utilization
     - Minimize re-compute via KVCache reuse and locality-aware request handling
     - Leverage zero-copy cache transfers across nodes
- **Enable system scalability**
   - Through a distributed KVCache pool
      - Allows cache offloading and reuse across multiple serving instances
   - User session duplication/migration for true and seamless load balancing


## Vision 

This goal structure above is shaped by our vision for emerging use cases like RAG and agentic workflows, 
which involve heavy context-reuse across sessions and instances. 
Shared documents, tool prompts, and workflow steps create overlapping token streams that benefit significantly from 
cross-instance KVCache coordination. 

To implement this vision, the KVCache-Manager incorporates proactive cache placement, session duplication, 
and cluster-level cache APIs - bridging gaps in current serving stacks where KVCache management and utilization is 
not yet treated as a first-class concern.

## Architecture Overview

The code defines a [kvcache.Indexer](https://github.com/llm-d/llm-d-kv-cache-manager/tree/main/pkg/kv-cache/indexer.go) module that efficiently maintains a global view of KV-cache states and localities. 
In the current state of vLLM, the only available information on KV-cache availability is that of the offloaded tensors to KV-cache Engines via the Connector API.

The `kvcache.Indexer` module is a pluggable Go package designed for use by orchestrators to enable KV-cache-aware scheduling decisions.

```mermaid
graph 
  subgraph Cluster
    Router
    subgraph KVCacheManager[KV-cache Manager]
      kvcache.Indexer[KV-cache Indexer]
      PrefixStore[LRU Prefix Store]
      KVBlockToPodIndex[KVBlock to Pod availability Index]
    end
    subgraph vLLMNode[vLLM Node]
      vLLMCore[vLLM Core]
      KVCacheEngine["KV-cache Engine (LMCache)"]
    end
    Redis
  end

  Router -->|"Score(prompt, ModelName, relevantPods)"| kvcache.Indexer
  kvcache.Indexer -->|"{Pod to Scores map}"| Router
  Router -->|Route| vLLMNode
  
  kvcache.Indexer -->|"FindLongestTokenizedPrefix(prompt, ModelName) -> tokens"| PrefixStore
  PrefixStore -->|"DigestPromptAsync"| PrefixStore
  kvcache.Indexer -->|"GetPodsForKeys(tokens) -> {KVBlock keys to Pods} availability map"| KVBlockToPodIndex
  KVBlockToPodIndex -->|"Redis MGet(blockKeys) -> {KVBlock keys to Pods}"| Redis

  vLLMCore -->|Connector API| KVCacheEngine
  KVCacheEngine -->|"UpdateIndex(KVBlock keys, nodeIP)"| Redis
```
This overview greatly simplifies the actual architecture and combines steps across several submodules.



## Architecture 

For even more a detailed architecture, refer to the [architecture](https://github.com/llm-d/llm-d-kv-cache-manager/tree/main/docs/architecture.md) document.

The architecture is designed to efficiently maintain a global view of KV-cache states and localities, enabling KV-cache-aware scheduling decisions.

### Detailed System Flow

```mermaid
sequenceDiagram
    participant U as User  
    participant KVI as kvcache.Indexer
    box
        participant KVBS as KVBlockScorer
        participant TPR as TokenProcessor
        participant KVBI as KVBlockIndexer
        participant Redis as Redis
    end
    box
        participant PS as PrefixStore
        participant LRUS as LRUStore
        participant TS as TrieStore
    end
    box
        participant TPO as TokenizersPool
        participant W as Worker
        participant CHT as HuggingFaceTokenizer
        participant CH as TokenizersCache
    end

# kvcache.Indexer
U->>KVI: 1. Score(prompt, ModelName, relevantPods)

# get available tokens of longest prefix
KVI->>PS: 2. FindLongestTokenizedPrefix(prompt, ModelName)
    alt LRU
        PS->>LRUS: 2.1 BuildLongestPrefix(prompt, ModelName)
    else Trie
        PS->>TS: 2.1 BuildLongestPrefix(prompt, ModelName)
    end
PS->>KVI: 2.2 Tokens of longest prefix

# get block keys  
KVI->>TPR: 3 GetBlockKeys(tokens, ModelName)
    TPR->>KVI: 3.1 BlockKeys

# query kvblock indexer for pods
KVI->>KVBI: 4. GetPodsForKeys(blockKeys, relevantPods)
KVBI->>Redis: 4.1 MGet(blockKeys)
Redis->>KVBI: 4.2 key -> Pods mapping (KV-cache availability)
KVBI->>KVBI: 4.3 FilterPods(relevantPods)

# score pods
KVI->>KVBS: 5. ScorePods(key->Pods) based on strategy

# results
KVI->>U: 6. Pod -> Score mapping

# add to tokenizers pool
KVI->>TPO: 2. AddTask(prompt, ModelName) // Registers task only
Note over TPO: Task added to queue
W-->>TPO: 2.1 Get(Task) // Async worker fetches task
W->>CHT: 2.3 Tokenize(prompt, ModelName)
CHT->>CH: 2.4 GetCachedTokenizerForModel()
CHT->>W: 2.5 Tokens
W->>PS: 2.6 AddTokens(prompt, ModelName, tokens)
alt LRU
    PS->>LRUS: 2.7 AddTokens(prompt, ModelName, tokens)
else Trie
    PS->>TS: 2.7 AddTokens(prompt, ModelName, tokens)
end
```

### Explanation
The main blocking sequence of steps that happens when a user (e.g., router) sends a request to the kvcache.Indexer is as follows:
1. **User** sends a request to the **kvcache.Indexer** with a prompt, model name, and relevant pods.
2. **kvcache.Indexer**:
   - Finds the longest tokenized prefix for the prompt and model name using the **PrefixStore**.
      - Depending on the store type (LRU or Trie), it gets the tokenization of the longest cached prefix
   - Adds a tokenization task to the **TokenizersPool**, which is handled asynchronously by a worker. This bit is explained later.
3. **kvcache.Indexer** queries the **TokenProcessor** to get block keys for the tokens of the longest prefix.
4. **TokenProcessor**:
   - Chunks the tokens and generate keys for the token blocks. The chunking and key calculating has to be aligned with
     the source that feeds the key -> pods backend (Redis).
   - Returns the block keys to the **kvcache.Indexer**.
5. **kvcache.Indexer** queries the **KVBlockIndexer** for pods that have the block keys.
   - The **KVBlockIndexer** queries the **Redis** backend for the mappings with MGet.
   - The **Redis** backend efficiently returns the key -> pods mapping.
6. **kvcache.Indexer** uses the configured **KVBlockScorer** to score the pods based block hits:
    - LongestPrefixMatch: scores by the longest consecutive (ordered) block hits in a single pod.
    - HighestBlockHit: scores by the index of the highest block hit in a single pod.
    - CoverageBasedMatching: scores by the total number of block hits in a single pod.

Asynchronous tokenization flow:
1. A worker fetches the task from the **TokenizersPool**.
2. The worker tokenizes the prompt using the **HuggingFaceTokenizer**.
3. The **HuggingFaceTokenizer** retrieves the cached in-memory tokenizer for the model.
    - If the tokenizer is not cached, it gets created and cached.
4. The **HuggingFaceTokenizer** returns the tokens to the worker.
5. The worker adds the tokens to the **PrefixStore**.
    - Depending on the store type (LRU or Trie), it adds the tokens to the appropriate store:
      - LRUStore: an LRU HashTable of prompt-chunks to tokens
      - TrieStore: a Trie of characters to tokens
    - Due to the nature of how tokenizers operate, the tokenization of a prefix of a prompt is a prefix of the tokenization of the full prompt.
        One challenge in tokenization is that different chunks of a prompt map to different tokens.
        Therefore, when we chunk a prompt, we use the [_, end] index associated with the tokens to contain token in a chunk.
        The implication of this design is that the tokens contained in a chunk are only correct if all previous chunks are also considered,
        since one token may be associated with the edge-characters of two consecutive chunks.

### Maintenance of Redis for KVBlock -> Pods Mapping

Currently, indexing information is updated from vLLM for the offloaded tokens using the Connector API, specifically leveraging the LMCache connector.

Future enhancements will enable the `llm-d-kv-cache-manager` component to process KV-cache events across all memory layers of vLLM, ensuring an accurate holistic view of KV-cache localities throughout the system.



## Examples

- [KV-cache Indexer](https://github.com/llm-d/llm-d-kv-cache-manager/tree/main/examples/kv-cache-index/): 
  - A reference implementation of using the `kvcache.Indexer` module.
- [KV-cache Aware Scorer](https://github.com/llm-d/llm-d-kv-cache-manager/tree/main/examples/kv-cache-aware-scorer/): 
  - A reference implementation of integrating the `kvcache.Indexer` module in 
  [llm-d-inference-scheduler](https://github.com/llm-d/llm-d-inference-scheduler) in a KV-cache aware scorer.
