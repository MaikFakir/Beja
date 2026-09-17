# Architectural Design: High-Throughput Event Streaming Platform

This example demonstrates the **Debate & Adversarial Peer Review** multi-agent reasoning topology in the Antigravity Multi-Agent Reasoning Framework.

---

## 1. Problem Statement

An enterprise financial services client requires a real-time event streaming pipeline capable of ingesting and analyzing transaction events under the following Service Level Objectives (SLOs):
- **Throughput**: $1,000,000\text{ events/sec}$ sustained with $3,000,000\text{ events/sec}$ peak bursts.
- **Latency**: Sub-$10\text{ ms}$ p99 end-to-end latency from ingress to analytical aggregation.
- **Data Loss Guarantee**: Strict Zero Data Loss ($RPO = 0$) and End-to-End Exactly-Once processing.
- **Disaster Recovery**: Cross-region automated failover with $RTO < 30\text{ seconds}$.
- **Cost Budget**: $<\$25,000\text{ / month}$ for all cloud compute, storage, and cross-region egress.

---

## 2. Multi-Agent Reasoning Topology

This scenario utilizes the **Debate & Adversarial Peer Review** workflow (`workflows/debate.md`):

```
                        ┌─────────────────────────────────────────┐
                        │      Orchestrator / Primary Agent       │
                        │    - Frames Problem & Invariants        │
                        │    - Dispatches Blind Parallel RFCs     │
                        └────────────┬──────────────────┬─────────┘
                                     │                  │
                      ┌──────────────▼───┐          ┌───▼──────────────┐
                      │  Proposer Alpha  │          │  Proposer Beta   │
                      │  (Log-Centric)   │          │  (Memory-First)  │
                      └──────────────┬───┘          └───┬──────────────┘
                                     │                  │
                                     └────────┬─────────┘
                                              │ Parallel Proposals
                                              ▼
                                 ┌─────────────────────────┐
                                 │     Critic Subagent     │
                                 │  - Adversarial Review   │
                                 │  - STRIDE Threat Model  │
                                 │  - Tradeoff Scoring     │
                                 └────────────┬────────────┘
                                              │ Score Matrix & Vulnerabilities
                                              ▼
                                 ┌─────────────────────────┐
                                 │   Synthesizer Arbiter   │
                                 │  - Rebuttal Integration │
                                 │  - Hybrid Specification │
                                 └─────────────────────────┘
```

---

## 3. Step-by-Step Agent Workflow Lifecycle

### Step 1: Problem Framing & Dispatch
The Orchestrator defines the problem statement, mandatory constraints ($RPO=0$, sub-10ms p99), and scoring dimensions, dispatching concurrent blind assignment prompts to two specialist proposers.

### Step 2: Parallel Blind Proposals
Two distinct subagents formulate independent technical solutions without observing each other's work:
1. **[Proposal Alpha: Log-Centric Architecture](artifacts/proposal_alpha.md)**:
   - Uses Redpanda NVMe Raft cluster + Apache Flink stateful compute with RocksDB backend.
   - Strengths: Proven $RPO=0$ durability and partition isolation.
   - Cost: $\$19,382\text{ / month}$.
2. **[Proposal Beta: Memory-First Ring Buffer Architecture](artifacts/proposal_beta.md)**:
   - Uses Aeron IPC / LMAX Disruptor zero-copy shared memory + in-memory Ray actor cluster.
   - Strengths: Blistering sub-millisecond p99 latency ($180\ \mu\text{s}$) and low footprint.
   - Cost: $\$13,308\text{ / month}$.

### Step 3: Adversarial Review & Score Matrix
The **Critic Subagent** performs a blind red-team audit:
- Identifies critical flaw in Proposal Beta: $100\text{ ms}$ asynchronous WAL flush window violates financial $RPO=0$ compliance if power fails.
- Identifies bottleneck in Proposal Alpha: Flink checkpoint barrier alignment stalls during downstream backpressure.
- Outputs the **[Adversarial Critic Review & Score Matrix](artifacts/critic_review.md)** (Alpha: 8.58/10, Beta: 6.47/10).

### Step 4: Rebuttal & Consensus Synthesis
Both proposers submit mitigations (Alpha adopts Unaligned Checkpoints; Beta decouples its zero-copy ring buffers into a dedicated stateless ingress gateway). The **Synthesizer Subagent** arbitrates consensus, publishing the **[Master Architecture Specification](artifacts/synthesis_spec.md)**.

---

## 4. Generated Artifacts

| Phase | Artifact File | Description |
|---|---|---|
| Proposal | [artifacts/proposal_alpha.md](artifacts/proposal_alpha.md) | Log-centric streaming architecture specification |
| Proposal | [artifacts/proposal_beta.md](artifacts/proposal_beta.md) | Memory-first ring buffer architecture specification |
| Critique | [artifacts/critic_review.md](artifacts/critic_review.md) | Adversarial vulnerability audit and 5-factor score matrix |
| Synthesis | [artifacts/synthesis_spec.md](artifacts/synthesis_spec.md) | Final hybrid architecture specification with verified SLOs |

---

## 5. Running the Simulation

Run the standalone simulation script to observe the multi-agent orchestration lifecycle in real time:

```bash
# Standard run with summary report
python run_example.py

# Verbose run showing full inter-agent message envelopes
python run_example.py --verbose

# Machine-readable JSON output
python run_example.py --json
```

---

## 6. Key Takeaways

1. **Blind Proposals Prevent Groupthink**: Generating independent proposals in parallel surfaces fundamentally distinct engineering approaches (storage-first vs memory-first).
2. **Adversarial Critique Uncovers Hidden Invariants**: A dedicated critic with strict domain constraints ($RPO=0$) catches subtle data loss failure modes that proposers minimize.
3. **Consensus via Synthesis Yields Superior Architecture**: Combining the low-latency ingress of Proposal Beta with the rock-solid durability of Proposal Alpha produces a hybrid architecture that outperforms both original proposals.
