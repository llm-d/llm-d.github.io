---
title: "BLIS: Evolving llm-d at Simulation Speed"
description: "BLIS is the llm-d simulator. It mirrors llm-d's control behavior — admission, routing, scheduling, KV cache, batching, and autoscaling — minus the GPUs. This post explains how BLIS helps llm-d evolve faster through AI-native experimentation and capacity planning."
slug: blis-evolving-llm-d-at-simulation-speed
date: 2026-06-05T09:00

authors:
  - merttoslali
  - dipanwitaguhathakurta
  - srinivasanparthasarathy
  - jingchen
  - nickmasluk
  - vishakharamani
  - michaelkalantar
  - assertantawi
  - fabiooliveira
  - carloscosta

tags: [blog]
---

# BLIS: Evolving llm-d at Simulation Speed

llm-d is built for distributed LLM serving: routing, flow control, placement, auto-scaling, disaggregation decisions, engine configuration, all happening at once. That makes it powerful, but also hard to evolve. A small policy change in admission, routing, batching, or autoscaling can change latency, throughput, and inference cost in unexpected ways.

Validating any change requires testing. But testing on real GPU clusters is slow and expensive.

BLIS solves this problem.

<!-- truncate -->

## The problem in one chart

llm-d's control plane spans admission, routing, scheduling, KV-cache management, batching, autoscaling, and prefill/decode placement. These decisions interact — a change in any one can shift latency, throughput, and cost in ways that are difficult to predict analytically. The standard approach is to test on a real cluster, but each experiment costs GPU-hours and wall-clock time:

![Cost vs wall-clock time — BLIS vs llm-d cluster](/img/blogs/blis-evolving-llm-d-at-simulation-speed/hero-cost-chart.png)

*Same question. Very different cost.*

## What is BLIS?

In essence, BLIS simulates llm-d. It mirrors llm-d's behavior: admission, routing, scheduling, KV cache, batching, and autoscaling — minus the GPUs.

![Real llm-d vs BLIS architecture](/img/blogs/blis-evolving-llm-d-at-simulation-speed/twin-diagram.png)

BLIS is not meant to replace real clusters. It offers an opportunity for fast and cheap experimentation to identify the most promising directions for targeted cluster runs.

*How can BLIS be useful without GPUs?* It is a discrete-event simulator with pluggable parts that mimic the physics of a single vLLM instance and the dynamics of llm-d's distributed serving. Each prefill and decode step is estimated by a performance model fit to real GPU measurements. That is enough to reproduce the queueing, batching, and latency a real cluster would see: no weights loaded, no tensors moved.

## What BLIS gives you

- **Fast and cheap.** Seconds per run. No GPUs.
- **Deterministic.** Same input, same output, every time.
- **Pluggable.** Drop in a new admission rule, scorer, or autoscaler. BLIS runs it as llm-d would.
- **High-fidelity.** Median 7–9% error on end-to-end and inter-token latency relative to real clusters. Validated across 36 experiments spanning dense and MoE models (8B–141B parameters, Llama/Mixtral/Qwen families), workloads from chat to code generation and long-output reasoning, H100/A100/L40S GPUs, and sweeps over vLLM configuration knobs (tensor parallelism, chunk size). Approximately 200× faster than equivalent real-cluster experiments.

## What BLIS unlocks

BLIS has two jobs: helping llm-d evolve faster, and helping users plan deployments before spending GPU time.

### AI-native evolution of llm-d

AI-native evolution means agents help propose, test, and improve policies (or new algorithms), with real clusters used to validate only the most promising ideas.

The idea is simple. **BLIS is the inner loop. Real llm-d is the outer loop.** Developers can connect BLIS to any policy-search workflow they choose, whether that is a human-driven sweep, a custom optimizer, or an AI-agent system.

![The AI-native loop: BLIS inner loop, real cluster outer loop](/img/blogs/blis-evolving-llm-d-at-simulation-speed/ai-native-loop.png)

In AI-native evolution, agents try many policies (or algorithms) in BLIS. The best ones go to a real cluster for validation. Lessons fold back into the next round of exploration. This loop is starting to deliver measurable improvements to llm-d.

#### From latency cliffs to graceful admission control

Under overload, default llm-d admission control can behave like a cliff: latency remains stable until a threshold, then degrades sharply. Using the AI-native loop with agents exploring policies inside BLIS, we found a smooth, parameter-free shedder. Validated on Qwen3-14B served on 4×H100-SXM-80GB at near-saturation load across realistic workloads (such as chatbot and code completion), the new policy reduced critical-tier TTFT p90 by up to 97% and end-to-end latency by up to 50%. Sheddable traffic is shed early, preventing queue buildup.

![Admission evolution: how it was found and what it found](/img/blogs/blis-evolving-llm-d-at-simulation-speed/admission-evolution.png)

For the full experimental setup and detailed results, see [our earlier post on the admission controller loop](https://ai-native-systems-research.github.io/ai-native-systems-research/blog/2026/05/13/from-simulation-to-production-how-an-ai-native-pipeline-discovered-a-better-admission-controller-for-llm-d/).

#### When to disaggregate prefill and decode

We used BLIS to study a multitude of heuristic policies, ranging from always local, always disaggregate, stationary randomized, and a dynamic policy called Drift Plus Penalty (DPP), inspired by Lyapunov optimization. We analyzed their performance under various workloads and arrival processes and observed regimes where each policy stands out.

The figure below shows a subset of results we obtained with BLIS. The Empirical DPP (EDPP) outperforms the prefix cache-based P/D decider currently in llm-d by 2-20x on TTFT. We've even seen the llm-d decider as actively harmful on long-context workloads like code-gen.

![PD Decider: Threshold=16 vs Empirical Drift Plus Penalty](/img/blogs/blis-evolving-llm-d-at-simulation-speed/pd-decider-ttft.png)

These are the kind of results that are expensive to find on real GPUs but natural to find with BLIS.

### Capacity planning

Before you deploy any LLMs for any purpose, you need answers:

- How many GPUs? Which GPU type?
- What configurations meet the SLO?
- Which router knobs — scorer weights, prefix-cache priority, load-balance settings?
- Which vLLM knobs — tensor parallelism, chunk size, batch limits?

Each of these used to mean a real-cluster experiment. With BLIS, it's a sweep that runs in seconds per config. BLIS can evaluate hundreds of configurations in minutes, producing a ranked set of viable options before any GPU time is spent.

![BLIS Config Search: Pareto Frontier for Llama-3.1-70B on H100](/img/blogs/blis-evolving-llm-d-at-simulation-speed/pareto-frontier.png)

Every dot is a BLIS evaluated configuration. The best throughput you can achieve at any given GPU budget while meeting your latency target. Up-and-to-the-left is better (fast and high-throughput). The dashed vertical represents a TTFT SLO we need to meet, and only points to the left represent configurations meeting that SLO. The starred configs represent the best-performing configurations for each budget tier in terms of GPU count.

Using multi-objective search, we can discover throughput, latency, and cost tradeoffs easily with BLIS. This experience gives you the ability to deploy only what you feel most confident about.

[llm-d-planner](https://github.com/llm-d-incubation/llm-d-planner), the deployment-recommendation tool for llm-d, is planned to consume BLIS output to power exactly this kind of sizing and policy advice.

---

## Why this matters

Without BLIS, llm-d evolves only as fast as people can run real-cluster experiments. Every new policy idea competes for scarce GPU time, and even routine development can become slow, expensive, and hard to iterate on.

With BLIS, llm-d developers get a fast, cheap inner loop before they touch a GPU. They can test routing changes, admission policies, batching behavior, prefill/decode decisions, and capacity assumptions in simulation, then reserve real clusters for the few ideas worth validating.

That matters whether the next idea comes from a human developer, an AI agent, or both. BLIS helps tame GPU scarcity for everyday llm-d development, while also enabling the AI-native loop: agents can explore many more policies than humans could test manually, and real clusters validate the best ones.

That is the shift: llm-d can evolve as fast as developers and agents can think, simulate, and learn.

---

## Limitations

The following areas highlight current limitations of BLIS:

- **Network effects:** BLIS models tensor-parallel and data-parallel communication overhead from profiling data, but does not explicitly model the network itself. Real network behavior varies with hardware topology, region, and is subject to jitter — none of which are captured.
- **Platform drift:** The simulator mirrors vLLM and llm-d behavior at a point in time. As the real stack evolves, the simulator must be updated to stay accurate.
- **Selective fidelity:** At any point in time, BLIS is not expected to model everything in llm-d and vLLM, but only the most load-bearing aspects of the real system. We focus on a few aspects at a time to improve algorithms in the stack, and those are the aspects prioritized for development in the simulator — on an as-needed-for-policy-evolution basis.
- **Saturated regimes:** BLIS's performance model is not calibrated for deeply saturated conditions. This is expected — in heavily overloaded systems, small perturbations in arrival or service times cause disproportionate queueing effects, making precise prediction impractical for any simulator. The practical goal is to identify policies that avoid saturation, not to predict behavior within it.

---

## Where to next

- **BLIS:** [inference-sim.github.io/inference-sim](https://inference-sim.github.io/inference-sim/latest/)
- **Earlier reads:**
  - [Why simulate before you scale](https://inference-sim.github.io/inference-sim/latest/blog/2026/03/05/why-simulate-before-you-scale/)
  - [The physics of high-fidelity distributed inference platform simulation](https://medium.com/modeling-distributed-inference/the-physics-of-high-fidelity-distributed-inference-platform-simulation-28fe27b59da2)
- **The admission controller story in full:** [From simulation to production](https://ai-native-systems-research.github.io/ai-native-systems-research/blog/2026/05/13/from-simulation-to-production-how-an-ai-native-pipeline-discovered-a-better-admission-controller-for-llm-d/)
- **The upcoming BLIS proposal for llm-d**
