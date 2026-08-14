#!/usr/bin/env python3
"""Generate the benchmark charts used by the P2P KV-cache-sharing blog."""

import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def fmt_ms(v):
    # round half up so 56.5 -> 57, matching the post's tables
    return f"{math.floor(v + 0.5):,} ms"


OUT = Path(__file__).resolve().parents[1] / "static/img/blogs/p2p-kv-cache"

BG = "#fbfbfd"
FG = "#222630"
MUTED = "#6c7280"
GRID = "#dce1e9"
GREEN = "#1ea97c"
GREEN_LIGHT = "#83cdb4"
BLUE = "#2e76d0"
BLUE_LIGHT = "#86afe1"
GRAY = "#8d939d"
GRAY_LIGHT = "#b7bbc2"


def style_figure(fig):
    fig.patch.set_facecolor(BG)
    for ax in fig.axes:
        ax.set_facecolor(BG)
        ax.tick_params(colors=MUTED, labelsize=10)
        ax.xaxis.label.set_color(FG)
        ax.yaxis.label.set_color(FG)
        for spine in ax.spines.values():
            spine.set_visible(False)


def add_source(fig, text):
    fig.text(0.012, 0.012, text, color=MUTED, fontsize=8.5)


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / name, dpi=160, facecolor=BG, bbox_inches="tight")
    plt.close(fig)


def crossover():
    tokens = np.array([2048, 8192, 16384, 32768, 49152])
    recompute = np.array([78.3, 249.9, 510.3, 1173.2, 1987.7])
    pull = np.array([34.6, 56.5, 85.9, 165.2, 235.0])

    fig, ax = plt.subplots(figsize=(11.5, 6.4))
    style_figure(fig)
    ax.grid(axis="y", color=GRID, linewidth=0.9)
    ax.set_axisbelow(True)

    ax.plot(
        tokens,
        recompute,
        color=GREEN,
        marker="o",
        markersize=7,
        linewidth=2.5,
        label="Recompute (local prefill)",
    )
    ax.plot(
        tokens,
        pull,
        color=BLUE,
        marker="o",
        markersize=7,
        linewidth=2.5,
        label="P2P pull (peer CPU tier)",
    )

    for x, y in zip(tokens, recompute):
        ax.annotate(
            fmt_ms(y),
            (x, y),
            xytext=(0, 10),
            textcoords="offset points",
            ha="center",
            color=FG,
            fontsize=9,
        )
    for x, y in zip(tokens, pull):
        ax.annotate(
            fmt_ms(y),
            (x, y),
            xytext=(0, -17),
            textcoords="offset points",
            ha="center",
            color=FG,
            fontsize=9,
        )

    ax.annotate(
        "",
        xy=(tokens[-1], pull[-1] + 60),
        xytext=(tokens[-1], recompute[-1] - 60),
        arrowprops={"arrowstyle": "<->", "color": BLUE, "linewidth": 1.4},
    )
    ax.annotate(
        "-88%",
        xy=(tokens[-1], (pull[-1] + recompute[-1]) / 2),
        xytext=(-8, 0),
        textcoords="offset points",
        ha="right",
        va="center",
        color=BLUE,
        fontsize=15,
        fontweight="bold",
    )

    ax.set_xticks(tokens, ["2K", "8K", "16K", "32K", "48K"])
    ax.set_ylim(-130, 2200)
    ax.set_yticks(np.arange(0, 2001, 250))
    ax.set_ylabel("Prefill latency (ms)", fontsize=11)
    ax.set_xlabel("Reusable prefix length (tokens)", fontsize=11)
    ax.legend(frameon=False, loc="upper left", fontsize=10)

    fig.text(
        0.012,
        0.955,
        "Pulling a cached prefix beats recomputing it at every measured length",
        color=FG,
        fontsize=17,
        fontweight="bold",
    )
    fig.text(
        0.012,
        0.915,
        "openai/gpt-oss-120b | H200 | canonical fixed-stack run | 5-rep medians, warm mesh",
        color=MUTED,
        fontsize=10.5,
    )
    add_source(fig, "Source: llm-d P2P KV-cache-sharing benchmarks, 2026-07")
    fig.subplots_adjust(left=0.09, right=0.985, top=0.86, bottom=0.13)
    save(fig, "crossover-gptoss.png")


def docqa():
    all_labels = [
        "Precise\ncold",
        "Precise\nwarm",
        "Precise + P2P\ncold",
        "Precise + P2P\nwarm",
        "Load + P2P\ncold",
        "Load + P2P\nwarm",
    ]
    all_colors = [GRAY, GRAY_LIGHT, GREEN, GREEN_LIGHT, BLUE, BLUE_LIGHT]
    all_p50 = [0.2, 0.3, 0.2, 0.3, 1.7, 0.6]
    all_p99 = [162.8, 25.2, 165.4, 18.6, 20.7, 16.6]
    all_tp = [3.93, 10.15, 3.90, 11.90, 11.34, 13.66]

    # blog variant: the two arms of the system-policy comparison;
    # guide variant: all three measured arms
    variants = [
        (
            "docqa.png",
            [0, 1, 4, 5],
            5.8,
            "Precise routing cold: 48 client timeouts.",
        ),
        (
            "docqa-three-arm.png",
            [0, 1, 2, 3, 4, 5],
            6.4,
            "Precise arms cold: 47-48 client timeouts.",
        ),
    ]
    for name, idx, height, timeouts_line in variants:
        labels = [all_labels[i] for i in idx]
        colors = [all_colors[i] for i in idx]
        p50 = np.array([all_p50[i] for i in idx])
        p99 = np.array([all_p99[i] for i in idx])
        throughput = np.array([all_tp[i] for i in idx])

        fig, axes = plt.subplots(1, 3, figsize=(13.2, height))
        style_figure(fig)

        metrics = [
            ("Median TTFT: the pull's price", "Seconds", p50, 2.1, "%.1f"),
            ("p99 TTFT collapses", "Seconds", p99, 215.0, "%.1f"),
            ("Throughput rises", "Turns/s", throughput, 15.5, "%.2f"),
        ]
        y = np.arange(len(labels))[::-1]
        for ax, (title, unit, values, xmax, value_format) in zip(axes, metrics):
            bars = ax.barh(y, values, color=colors, height=0.58)
            ax.set_title(title, color=FG, fontsize=11, pad=12)
            ax.set_xlabel(unit, fontsize=10)
            ax.set_xlim(0, xmax)
            ax.set_yticks(y, [label.replace("\n", " ") for label in labels])
            ax.grid(axis="x", color=GRID, linewidth=0.8)
            ax.set_axisbelow(True)
            ax.bar_label(
                bars,
                fmt=value_format,
                padding=4,
                color=FG,
                fontsize=9,
            )

        fig.text(
            0.012,
            0.955,
            "Load-aware placement + P2P collapses the document-Q&A tail",
            color=FG,
            fontsize=17,
            fontweight="bold",
        )
        fig.text(
            0.012,
            0.915,
            "16x H200 | 192 documents x 48K tokens | 128 concurrent sessions | system-policy comparison",
            color=MUTED,
            fontsize=10.5,
        )
        fig.text(
            0.012,
            0.875,
            f"{timeouts_line} Load-aware + P2P: zero timeouts in all runs.",
            color=MUTED,
            fontsize=9.5,
        )
        add_source(fig, "Source: llm-d P2P KV-cache-sharing benchmarks, 2026-07")
        fig.subplots_adjust(left=0.115, right=0.985, top=0.80, bottom=0.16, wspace=0.42)
        save(fig, name)


def wide_ep():
    metrics = [
        ("Mean TTFT", "Seconds", 7.85, 2.56, "-67%", 8.7, "%.2f"),
        ("p90 TTFT", "Seconds", 21.3, 5.0, "-77%", 23.5, "%.1f"),
        ("Throughput", "Requests/s", 3.8, 10.1, "2.7x", 11.2, "%.1f"),
    ]

    fig, axes = plt.subplots(1, 3, figsize=(12.6, 4.9))
    style_figure(fig)

    for ax, (title, unit, baseline, p2p, delta, xmax, vfmt) in zip(axes, metrics):
        bars = ax.barh(
            [1, 0],
            [baseline, p2p],
            color=[GRAY, BLUE],
            height=0.48,
        )
        ax.set_yticks([1, 0], ["Without P2P", "With P2P"])
        ax.set_xlim(0, xmax)
        ax.set_xlabel(unit, fontsize=10)
        ax.set_title(title, color=FG, fontsize=12, pad=13)
        ax.grid(axis="x", color=GRID, linewidth=0.8)
        ax.set_axisbelow(True)
        ax.bar_label(
            bars,
            labels=[vfmt % baseline, vfmt % p2p],
            padding=5,
            color=FG,
            fontsize=10,
        )
        ax.text(
            0.98,
            0.52,
            delta,
            transform=ax.transAxes,
            ha="right",
            va="top",
            color=BLUE,
            fontsize=15,
            fontweight="bold",
        )

    fig.text(
        0.012,
        0.955,
        "P2P turns load spill from recomputation into transfer",
        color=FG,
        fontsize=17,
        fontweight="bold",
    )
    fig.text(
        0.012,
        0.905,
        "GLM-5.2-FP8 wide-EP | 32x H200 | identical load-first placement; P2P is the only policy difference",
        color=MUTED,
        fontsize=10.5,
    )
    add_source(fig, "Source: llm-d P2P KV-cache-sharing benchmarks, 2026-07")
    fig.subplots_adjust(left=0.09, right=0.985, top=0.78, bottom=0.18, wspace=0.42)
    save(fig, "wide-ep-load-spill.png")


def glm_c64():
    policies = [
        "Approximate routing\nP2P disabled",
        "Approximate routing\nP2P enabled",
        "Precise routing\nP2P disabled",
        "Precise routing\nP2P enabled",
    ]
    successful_rps = np.array([2.890, 3.023, 2.927, 3.210])
    baseline_delta = [None, 4.6, 1.3, 11.1]
    colors = [GRAY, BLUE_LIGHT, GRAY_LIGHT, BLUE]

    fig, ax = plt.subplots(figsize=(11.5, 6.2))
    style_figure(fig)

    x = np.arange(4)
    bars = ax.bar(x, successful_rps, width=0.58, color=colors)
    ax.set_xticks(x, policies)
    ax.set_ylabel("Successful requests/s", fontsize=10)
    ax.set_ylim(0, 3.85)
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.bar_label(bars, fmt="%.3f", padding=4, color=FG, fontsize=9)
    for xpos, value, delta in zip(x, successful_rps, baseline_delta):
        label = "baseline" if delta is None else f"+{delta:.1f}%"
        ax.text(
            xpos,
            value + 0.18,
            label,
            ha="center",
            va="bottom",
            color=MUTED if delta is None else BLUE,
            fontsize=10,
            fontweight="bold",
        )

    fig.text(
        0.012,
        0.955,
        "P2P improves throughput with both routing methods",
        color=FG,
        fontsize=17,
        fontweight="bold",
    )
    fig.text(
        0.012,
        0.915,
        "GLM-5.2-FP8 | 32x H200 | 2 prefill + 2 decode | concurrency 64",
        color=MUTED,
        fontsize=10.5,
    )
    fig.text(
        0.012,
        0.88,
        "300-second comparison; percentages use approximate routing without P2P as the baseline",
        color=MUTED,
        fontsize=9.5,
    )
    add_source(fig, "Source: llm-d GLM-5.2 C64 benchmark, 2026-08")
    fig.subplots_adjust(left=0.09, right=0.985, top=0.79, bottom=0.17)
    save(fig, "glm-c64-policy-comparison.png")


if __name__ == "__main__":
    crossover()
    docqa()
    wide_ep()
    glm_c64()
