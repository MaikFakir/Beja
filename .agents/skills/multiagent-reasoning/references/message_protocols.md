# Inter-Agent Message Protocols & Envelope Specification

The **Antigravity Multi-Agent Reasoning Framework** relies on a robust, asynchronous, event-driven messaging architecture. This document defines the formal communication contracts, envelope schemas, zero-polling reactive rules, watchdog timer protocols, and multi-agent coordination topologies.

---

## 1. Core Communication Directives

### 1.1 The Zero-Polling Principle
Antigravity's multi-agent runtime is fully event-driven. When an agent dispatches subtasks via `invoke_subagent` or sends coordination messages via `send_message`, the execution environment **automatically suspends** the sending agent until an incoming event occurs.

The system reactively awakens the agent when:
1. A message arrives from a subagent, parent, or peer agent.
2. A background task or scheduled timer completes or triggers a notification.
3. A user-queued message arrives.

**Strict Prohibition**: Agents must **NEVER** run tight polling loops, `sleep` commands, or repeated `manage_task(Action='status')` polling loops. Doing so wastes computational resources, depletes tool-call quotas, and pollutes reasoning context. After dispatching messages or tasks, agents simply conclude their turn with no further tool calls.

```
┌─────────────────┐       invoke_subagent / send_message      ┌─────────────────┐
│ Orchestrator    ├──────────────────────────────────────────►│ Subagent Worker │
│ (Suspends Turn) │                                           │ (Executes Task) │
│                 │◄──────────────────────────────────────────┤                 │
└─────────────────┘             send_message                  └─────────────────┘
                             (Reactive Wakeup)
```

### 1.2 File vs. Message Separation
To maximize context efficiency and prevent message truncation:
- **Files are for Content**: Comprehensive analyses, source code patches, test logs, architectural diagrams, and 5-component handoff reports MUST be written to disk in `.agents/<agent_name>/`.
- **Messages are for Notification & Coordination**: Messages transmitted via `send_message` contain only concise metadata, execution status, summaries, and relative file paths.

```
[Agent Alpha] ── (Writes Report) ──► [.agents/agent_alpha/handoff.md]
     │
     └── (send_message: "Handoff ready at .agents/agent_alpha/handoff.md") ──► [Agent Beta (Awakened)]
```

---

## 2. Standard Message Envelope Specification

All inter-agent messages must adhere to the standard envelope structure defined below.

### 2.1 Markdown Envelope Format
When formatting text messages, agents format messages using these standard fields:

```markdown
**Context**: [<Workflow Name> | <Task ID> | <Phase>]
**Content**: [<Concise summary of deliverable, finding, or request>]
**Action**: [<Explicit instruction for recipient: "Review Handoff", "Execute Stage 2", "Escalate">]
**Payload**:
- Status: [SUCCESS | IN_PROGRESS | BLOCKED | FAILED]
- ArtifactPath: [Relative path to deliverable, e.g. .agents/planner/plan.md]
- CorrelationId: [<correlation_uuid>]
- InvariantsVerified: [true | false]
```

### 2.2 Formal JSON Schema Alignment
All messages correspond to the formal [Message Envelope JSON Schema](../resources/schemas/message_envelope.json):

| Field Name | Type | Required | Description |
|---|:---:|:---:|---|
| `message_id` | `string` | Yes | Unique message identifier matching `^msg-[a-z0-9_-]+$` |
| `sender_id` | `string` | Yes | Identifier or archetype role of the sending agent |
| `recipient_id` | `string` | Yes | Identifier or archetype role of the recipient agent |
| `timestamp` | `string` | Yes | ISO 8601 UTC timestamp (e.g. `2026-08-24T21:54:00Z`) |
| `message_type` | `enum` | Yes | Semantic message classification (see §3) |
| `context` | `string` | Yes | Brief description of workflow phase, task ID, or active context |
| `content` | `string` | Yes | Core communication content or executive deliverable summary |
| `action` | `string` | Yes | Explicit expected next action for recipient |
| `payload` | `object` | No | Structured metadata, artifact paths, verdicts, scores |

---

## 3. Semantic Message Types

The framework defines seven standardized message types:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Semantic Message Types                           │
├───────────────────────┬─────────────────────────────┬───────────────────────┤
│ task_dispatch         │ handoff_report              │ heartbeat_update      │
│ (Assign task & inputs)│ (Deliverable complete)      │ (Liveness timestamp)  │
├───────────────────────┼─────────────────────────────┼───────────────────────┤
│ clarification_request │ critique_verdict            │ consensus_vote        │
│ (Ask clarifying query)│ (Adversarial review verdict)│ (Arbiter decision)    │
├───────────────────────┴─────────────────────────────┴───────────────────────┤
│ error_escalation                                                            │
│ (Escalate unresolvable failure or deadlock to higher tier)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 `task_dispatch`
Dispatches an atomic subtask from a coordinator/planner to a specialist worker.

```markdown
**Context**: Hierarchical Decomposition | Task T2: Auth Cache Implementation | Phase: Implementation
**Content**: Dispatched task to implement thread-safe token cache adhering to interface spec.
**Action**: Implement `src/auth/token_cache.py`, author unit tests, verify build, and produce handoff.md.
**Payload**:
- Status: IN_PROGRESS
- ArtifactPath: .agents/planner/interface_spec.md
- CorrelationId: dispatch-task-t2-8921
- InvariantsVerified: true
```

### 3.2 `handoff_report`
Transmitted by a worker upon successful completion of a task and publication of `handoff.md`.

```markdown
**Context**: Hierarchical Decomposition | Task T2: Auth Cache Implementation | Phase: Verification
**Content**: Completed token cache implementation. All 14 unit tests pass with zero regressions.
**Action**: Verify handoff deliverable against stage invariants and unlock downstream Task T3.
**Payload**:
- Status: SUCCESS
- ArtifactPath: .agents/synthesizer/handoff.md
- CorrelationId: dispatch-task-t2-8921
- InvariantsVerified: true
```

### 3.3 `critique_verdict`
Transmitted by an Adversarial Critic delivering review verdicts.

```markdown
**Context**: Iterative Refinement Loop | Iteration 2 | Phase: Adversarial Critique
**Content**: Critique complete for candidate patch v2. Identified 1 minor edge-case in TTL expiration.
**Action**: Generator to apply delta fix for edge case; Verifier to run stress test harness.
**Payload**:
- Status: BLOCKED
- Verdict: REQUEST_CHANGES
- Score: 88.5
- ArtifactPath: .agents/critic/critique_v2.md
- CorrelationId: loop-iter-2-7719
```

### 3.4 `clarification_request`
Transmitted when a subagent detects ambiguous requirements, conflicting invariants, or missing files.

```markdown
**Context**: Map-Reduce Exploration | Explorer 2: Memory Audit | Phase: Investigation
**Content**: Missing database schema definitions for buffer cache table `session_buffers`.
**Action**: Coordinator to provide schema path or re-scope exploration boundary.
**Payload**:
- Status: BLOCKED
- CorrelationId: clar-exp2-3312
- InvariantsVerified: false
```

### 3.5 `consensus_vote`
Transmitted by an Arbiter or Proposer to establish architectural consensus in a debate workflow.

```markdown
**Context**: Debate Protocol | Stream Processing Architecture | Phase: Arbitration
**Content**: Consensus synthesized. Adopt Redpanda for ingestion and Flink for stateful windowing.
**Action**: Synthesizer to implement baseline architecture stubs based on consensus spec.
**Payload**:
- Status: SUCCESS
- Verdict: APPROVED
- Score: 96.0
- ArtifactPath: .agents/arbiter/consensus_spec.md
- CorrelationId: debate-stream-6641
```

### 3.6 `error_escalation`
Transmitted when an agent encounters an unrecoverable failure, cyclic deadlock, or context saturation.

```markdown
**Context**: Iterative Refinement Loop | Iteration 5 | Phase: Termination Gate
**Content**: Maximum iteration budget (5) reached without achieving 100% test convergence.
**Action**: Escalate to Tier 4 human/master supervisor with compiled Escalation Dossier.
**Payload**:
- Status: FAILED
- ArtifactPath: .agents/supervisor/escalation_dossier.md
- CorrelationId: loop-iter-5-escalate
- InvariantsVerified: false
```

---

## 4. Communication Topologies & Coordination Patterns

The framework supports four fundamental communication patterns:

```
1. 1:1 Direct Delegation       2. Fan-Out (Map)           3. Fan-In (Reduce)
   [Planner]                      [Coordinator]              [Workers]
      │                              │  │  │                  │  │  │
      ▼                              ▼  ▼  ▼                  ▼  ▼  ▼
   [Worker]                       [E1] [E2] [E3]            [Reducer]

4. Staged Pipeline
   [Planner] ──► [Researcher] ──► [Synthesizer] ──► [Critic] ──► [Verifier]
```

### 4.1 1:1 Direct Delegation (Request-Response)
- **Use Case**: Hierarchical atomic task delegation.
- **Protocol**: Coordinator transmits `task_dispatch` $\to$ Worker executes $\to$ Worker replies with `handoff_report`.

### 4.2 Fan-Out Broadcast (Map Dispatch)
- **Use Case**: Spawning multiple explorers or proposers concurrently.
- **Protocol**: Coordinator invokes $M$ agents concurrently, transmitting distinct task envelopes $\to$ Coordinator enters reactive wait.

### 4.3 Fan-In Aggregation (Reduce Accumulation)
- **Use Case**: Collecting findings from multiple workers.
- **Protocol**: Coordinator accumulates incoming `handoff_report` envelopes until all $M$ agents report or quorum timeout fires $\to$ Coordinator triggers Reducer.

### 4.4 Staged Pipeline Handoff
- **Use Case**: Multi-stage code authoring and verification.
- **Protocol**: Stage $k$ worker completes deliverable and passes artifact reference to Stage $k+1$ worker.

---

## 5. Watchdog Timeout Supervision & Scheduled Timers

To prevent deadlock from silent failures or hanging tasks, coordinators configure **Watchdog Timers** using the `schedule` tool:

```python
# Configure a one-shot watchdog timer that cancels early upon subagent message arrival
schedule(
    DurationSeconds=600,
    Prompt="Watchdog timeout fired: Check status of Subagent worker_t2",
    TimerCondition="worker_t2"
)
```

### Operational Rules for Watchdogs:
1. **Early Cancellation (`TimerCondition`)**: If the watched subagent sends a message before `DurationSeconds` elapses, the runtime automatically cancels the timer with zero computational waste.
2. **Never Use Sleep Loops**: Agents must never run background `sleep` or polling loops for timeout management; always use `schedule`.
3. **Timeout Expiration Handling**: When a watchdog timer fires, the coordinator checks the worker's `progress.md` timestamp. If the worker is unresponsive, Tier 2 escalation (replacement) is initiated.

---

## 6. Related Protocols & References

- **[Message Envelope JSON Schema](../resources/schemas/message_envelope.json)**
- **[Subagent Lifecycle Management](agent_lifecycle.md)**
- **[Subagent Tool Matrix](tool_matrix.md)**
- **[Hierarchical Decomposition Workflow](../workflows/hierarchical.md)**
- **[Debate Protocol Workflow](../workflows/debate.md)**
- **[Map-Reduce Exploration Workflow](../workflows/map_reduce.md)**
- **[Iterative Refinement Loop Workflow](../workflows/iterative_loop.md)**
