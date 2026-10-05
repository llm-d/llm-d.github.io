# Demo

See [baseline](../../docs/architecture/README.md) and [values](./router/values.yaml).

<!-- guide:env.static start -->
```bash
export ACCELERATOR_TYPE=gpu # options: gpu, amd, tpu/v7
export MODEL_SERVER=vllm # options: vllm, sglang
export MODEL=Qwen/Qwen3-32B
```
<!-- guide:env.static end -->

<!-- variants:start -->
<details open data-when="ACCELERATOR_TYPE=gpu">
<summary><b>NVIDIA GPU</b></summary>

```bash
kubectl apply -k gpu
```

</details>
<details data-when="ACCELERATOR_TYPE=amd,tpu/v7">
<summary><b>Other accelerators</b></summary>

```bash
kubectl apply -k other
```

</details>
<!-- variants:end -->

![chart](bench/run1/chart.png)

- [Run 1](./bench/run1/README.md)
