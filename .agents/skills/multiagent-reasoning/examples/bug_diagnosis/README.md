# Bug Diagnosis: Distributed Race Condition & Memory Leak

This example demonstrates the **Map-Reduce / Parallel Exploration** and **Iterative Refinement Loop** multi-agent reasoning topologies in the Antigravity Multi-Agent Reasoning Framework.

---

## 1. Problem Statement

A high-throughput ingestion microservice (`IngestionWorkerPool`) processing $50,000\text{ tasks/min}$ in Python asyncio exhibits catastrophic production degradation under load:
- **Memory Creep**: Resident Set Size (RSS) memory increases monotonically by $\sim 150\text{ MB/hour}$ until killed by the Kubernetes OOMKiller.
- **Latency Spikes**: p99 task latency degrades from $<10\text{ ms}$ to $>3,500\text{ ms}$.
- **Connection Collisions**: Intermittent `asyncio.InvalidStateError`, `ConnectionCollisionError`, and duplicate write crashes occur during client timeout cancellations.

---

## 2. Multi-Agent Reasoning Topologies

This scenario combines two powerful multi-agent topologies:
1. **Map-Reduce / Parallel Exploration** (`workflows/map_reduce.md`): Partitions the diagnosis space into 3 independent hypotheses evaluated simultaneously by concurrent explorer subagents.
2. **Iterative Refinement Loop** (`workflows/iterative_loop.md`): Generator $\to$ Critic $\to$ Verifier loop with explicit convergence criteria ($\le 3$ turns).

```
                            MAP-REDUCE INVESTIGATION PHASE
                                          
                           ┌───────────────────────────┐
                           │      Orchestrator         │
                           │ - Partitions Hypotheses   │
                           └─────────────┬─────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │    Researcher 1     │ │    Researcher 2     │ │    Researcher 3     │
      │  - Hypothesis A     │ │  - Hypothesis B     │ │  - Hypothesis C     │
      │  - Memory & GC      │ │  - Locks & Races    │ │  - TCP Backpressure │
      └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         ▼
                           ┌───────────────────────────┐
                           │   Reducer Critic Subagent │
                           │ - Synthesizes Root Causes │
                           └─────────────┬─────────────┘
                                         │
                        ITERATIVE REFINEMENT LOOP PHASE
                                         ▼
                     ┌───────────────────────────────────────┐
                     │         Synthesizer (Patch Gen)       │
                     └───────────────────┬───────────────────┘
                                         │ Draft Patch
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          Critic (Reviewer)            │ ◄── Rejects Turn 1 (Race defect)
                     └───────────────────┬───────────────────┘
                                         │ Approved Turn 2
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          Verifier (Harness)           │ ◄── Runs Live Load Benchmark
                     └───────────────────────────────────────┘
```

---

## 3. Step-by-Step Agent Workflow Lifecycle

### Step 1: Hypothesis Partitioning (Map Dispatch)
The Orchestrator partitions the unknown failure space into 3 independent domains:
- **Hypothesis A**: Unbounded coroutine reference leak in background task registry.
- **Hypothesis B**: Concurrency race condition / double-release in connection pool during cancellation.
- **Hypothesis C**: TCP socket buffer bloat and SSL backpressure accumulation.

### Step 2: Parallel Investigation & Evidence Gathering
Three specialist explorer subagents investigate concurrently:
1. **[Researcher 1 Report (Hypothesis A)](artifacts/hypothesis_memory_leak.md)**: **CONFIRMED**. Identifies 148k leaked task closures in `_active_tasks` set due to strong reference retention in cancelled callbacks.
2. **[Researcher 2 Report (Hypothesis B)](artifacts/hypothesis_race_condition.md)**: **CONFIRMED**. Discovers non-atomic `await conn.reset_state()` in `ConnectionPool.release()` where mid-reset cancellation triggers redundant finally release, corrupting the connection queue.
3. **[Researcher 3 Report (Hypothesis C)](artifacts/hypothesis_tcp_backpressure.md)**: **DISPROVED**. Confirms socket send buffers drain within normal limits ($\le 128\text{ KB}$).

### Step 3: Map-Reduce Synthesis
The Reducer subagent merges findings into the **[Consolidated Root Cause Analysis](artifacts/root_cause_analysis.md)**, demonstrating a compounded failure mode.

### Step 4: Iterative Refinement Loop
1. **Turn 1 (Initial Implementation)**: Synthesizer drafts patch using `WeakSet` + lock around release. Critic rejects because unshielded `reset_state()` can still be interrupted mid-I/O.
2. **Turn 2 (Refined Implementation)**: Synthesizer introduces `ConnectionState` atomic CAS transitions, `asyncio.shield()` around reset, and deterministic finalizers. Critic approves.
3. **Verification**: Verifier executes live benchmark with 50,000 tasks $\implies$ 100% pass (0 leaks, 0 collisions, p99 $< 3.5\text{ ms}$).

---

## 4. Generated Artifacts

| Phase | Artifact File | Description |
|---|---|---|
| Map | [artifacts/hypothesis_memory_leak.md](artifacts/hypothesis_memory_leak.md) | Deep memory and garbage collection profiling report |
| Map | [artifacts/hypothesis_race_condition.md](artifacts/hypothesis_race_condition.md) | Concurrency lock audit and race condition sequence trace |
| Map | [artifacts/hypothesis_tcp_backpressure.md](artifacts/hypothesis_tcp_backpressure.md) | Network buffer analysis and empirical negative finding |
| Reduce | [artifacts/root_cause_analysis.md](artifacts/root_cause_analysis.md) | Multi-hypothesis synthesis identifying compounded defects |
| Refine | [artifacts/verified_patch.py](artifacts/verified_patch.py) | Production-ready Python patch for `IngestionWorkerPool` |
| Verifier | [artifacts/verification_log.txt](artifacts/verification_log.txt) | Benchmark execution log verifying zero leaks and zero races |

---

## 5. Running the Simulation

Execute the diagnosis simulation and live benchmark:

```bash
# Standard run with summary report
python run_example.py

# Verbose run showing all agent message passing envelopes
python run_example.py --verbose

# Run live asyncio benchmark (5000 concurrent tasks with 20% timeout cancellations)
python run_example.py --run-benchmark

# Machine-readable JSON output
python run_example.py --json
```

---

## 6. Key Takeaways

1. **Map-Reduce Parallelism Slashes TTD (Time To Diagnosis)**: Exploring memory, concurrency, and network hypotheses simultaneously resolves complex bugs in parallel turns rather than sequential trial-and-error.
2. **Negative Evidence is Critical**: Proving Hypothesis C false prevents wasteful optimization of healthy network transport layers.
3. **Critic + Verifier Prevents Incomplete Fixes**: In Turn 1, the critic caught subtle race conditions that simple code inspections would have missed, ensuring the delivered patch is robust under extreme concurrency.
