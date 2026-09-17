# Consolidated Root Cause Analysis: Distributed Ingestion Worker Crashing & Memory Creep

**Author**: Map-Reduce Reducer / Critic Subagent  
**Status**: Root Cause Verified & Remediated  
**Workflow**: Map-Reduce + Iterative Refinement Loop  

---

## 1. Executive Summary

A parallel multi-agent investigation across three concurrent explorer subagents resolved the root causes of the severe memory creep (~150MB/hour) and intermittent connection crashes in the `IngestionWorkerPool` service.

The defect was traced to a **dual compounded failure mode**:
1. **Primary Memory Creep**: Strong circular references in `IngestionWorkerPool._active_tasks` preventing garbage collection of cancelled asyncio tasks.
2. **Primary Crash & Corruption Vector**: A non-atomic yield point in `ConnectionPool.release()` allowing double-release and concurrent multi-worker socket acquisition under timeout cancellations.

```
+-----------------------------------------------------------------------------------------+
|                                    MAP-REDUCE SUMMARY                                   |
+--------------------------+----------------------------+---------------------------------+
| Subagent                 | Investigated Hypothesis    | Verdict & Evidence              |
+--------------------------+----------------------------+---------------------------------+
| Researcher-1 (Memory)    | Task Registry GC Leak      | CONFIRMED (148k leaked tasks)   |
| Researcher-2 (Locking)   | Connection Pool Race Cond  | CONFIRMED (Double-release race) |
| Researcher-3 (Network)   | TCP Socket Backpressure    | DISPROVED (Buffers drain OK)    |
+--------------------------+----------------------------+---------------------------------+
```

---

## 2. Compounded Defect Mechanism

When a high-concurrency burst occurs:
1. Upstream requests begin hitting timeouts ($500\text{ ms}$).
2. Timeouts trigger task cancellation (`asyncio.CancelledError`).
3. Cancelled tasks fail to deregister from `_active_tasks` because closure callbacks retain strong references $\implies$ **Memory Leak**.
4. Simultaneously, workers executing `ConnectionPool.release()` are cancelled mid-way during `await conn.reset_state()`, causing double-release $\implies$ **Socket Collision & Crash**.

---

## 3. Iterative Refinement Summary

- **Iteration 1**: Initial patch introduced `weakref.WeakSet` and an `asyncio.Lock` around release.
  - *Critic Review*: Flagged race condition where timeout mid-handshake leaves connection in indeterminate state.
  - *Verifier Test*: 1 out of 5 stress runs failed due to stray pending futures.
- **Iteration 2 (Final)**: Implemented atomic CAS state transitions (`IDLE` $\to$ `ACQUIRED` $\to$ `RELEASING`), wrapped resets in `asyncio.shield()`, and enforced deterministic finally cleanup.
  - *Critic Review*: Approved (100% invariant satisfaction).
  - *Verifier Test*: 5 out of 5 runs passed ($50,000$ iterations, $0$ leaked tasks, $0$ duplicate acquisitions).
