---
name: multiagent-reasoning
description: >-
  Provides structured multi-agent reasoning topologies and specialized subagent orchestration for complex coding, architectural design, debugging, and research tasks in Antigravity.
  Use this skill when:
  - Decomposing large, ambiguous, or multi-phase engineering tasks into structured dependency graphs (DAG).
  - Investigating complex, multi-root-cause bugs or performance bottlenecks across large codebases.
  - Designing systems with architectural tradeoffs requiring adversarial debate, red-teaming, or STRIDE threat modeling.
  - Conducting parallel codebase exploration or multi-hypothesis validation (Map-Reduce).
  - Executing iterative code refinement loops (Generator -> Critic -> Verifier) with strict termination criteria.
  DO NOT use this skill for:
  - Simple, single-file edits or trivial syntax fixes.
  - Standalone documentation lookups or quick informational queries.
  - Standard git commits or commit message drafting.
  - Simple script execution or basic shell commands.
risk: safe
source: official
version: 1.0.0
date_added: "2026-08-24"
---

# Antigravity Multi-Agent Reasoning Framework

The **Antigravity Multi-Agent Reasoning Framework** (`multiagent-reasoning`) is an enterprise-grade customization that equips Antigravity orchestrators with structured multi-agent coordination architectures. It partitions complex cognitive workloads across specialized subagents, enforces strict tool permission boundaries, and coordinates execution through four proven reasoning topologies.

```
                  ┌─────────────────────────────────────────────────────────────┐
                  │                 Orchestrator / Primary Agent                │
                  │   - Assesses Task Complexity & Selects Reasoning Topology   │
                  │   - Enforces Tool Permissions & Reactive Wakeup Protocol    │
                  └──────┬──────────────┬──────────────┬──────────────┬─────────┘
                         │              │              │              │
                         ▼              ▼              ▼              ▼
                  ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
                  │   Planner    ││  Researcher  ││    Critic    ││ Synthesizer  │
                  │  Architect   ││   Explorer   ││  Adversarial ││  Implementer │
                  │ (Read+Subag) ││  (Read+MCP)  ││ (Read-Only)  ││ (Write+Exec) │
                  └──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

---

## 1. Complexity Assessment & Topology Selector

Before spawning subagents, assess the problem complexity to determine the optimal reasoning topology, subagent team composition, and termination constraints.

| Complexity Level | Problem Characteristics | Recommended Reasoning Topology | Subagent Team Composition | Max Refinement Turns |
|---|---|---|---|---|
| **Low** | Single-module fix, isolated bug, clear repro steps | Direct Single-Agent Execution (No subagents needed) | Orchestrator only | 1 turn |
| **Medium** | Multi-file feature, well-defined architecture, clear invariants | **Hierarchical Decomposition & Delegation** (`workflows/hierarchical.md`) | `planner` + `synthesizer` | 2 turns |
| **High** | Architectural redesign, trade-off evaluation, security-sensitive module | **Debate & Adversarial Review** (`workflows/debate.md`) or **Iterative Loop** (`workflows/iterative_loop.md`) | `planner` + `researcher` + `critic` + `synthesizer` | 3 turns |
| **Extreme** | Concurrency bug, unknown root cause across distributed subsystems | **Map-Reduce / Parallel Exploration** (`workflows/map_reduce.md`) + **Iterative Loop** | $N \times \text{researcher}$ + `critic` + `synthesizer` | 4 turns |

---

## 2. Progressive Disclosure Index & Navigation

To preserve context window efficiency, detailed instructions, prompt templates, and protocols are modularized. Follow the links below for deep-dive specifications:

### 2.1 Specialized Subagent Prompts (`prompts/`)
- **[Planner / Architect Subagent](prompts/planner.md)**: MECE decomposition, DAG generation, invariant formulation, and milestone roadmaps.
- **[Researcher / Explorer Subagent](prompts/researcher.md)**: Deep codebase auditing, empirical evidence chains with exact line citations, documentation analysis, and hypothesis ranking.
- **[Critic / Adversarial Reviewer Subagent](prompts/critic.md)**: Blind adversarial inspection, STRIDE security and threat modeling, boundary condition probing, and assumption stress-testing.
- **[Synthesizer / Implementer Subagent](prompts/synthesizer.md)**: Cohesive code implementation, minimal atomic diff generation, build/test execution, and 5-component handoff delivery.

### 2.2 Reasoning Topology Workflows (`workflows/`)
- **[Hierarchical Decomposition Workflow](workflows/hierarchical.md)**: Master orchestrator plans, delegates subtasks to specialists, and aggregates deliverables.
- **[Debate & Adversarial Review Workflow](workflows/debate.md)**: Two competing hypotheses/proposals evaluated by an independent critic, synthesized into a consensus solution.
- **[Map-Reduce / Parallel Exploration Workflow](workflows/map_reduce.md)**: Spawns $N$ concurrent subagents to investigate independent hypotheses, reducing findings into a verified root cause.
- **[Iterative Refinement Loop Workflow](workflows/iterative_loop.md)**: Generator $\to$ Critic $\to$ Verifier loop with hard stopping conditions ($\max \text{turns} \le 3$, convergence criteria).

### 2.3 Deep Reference Manuals (`references/`)
- **[Agent Lifecycle & Timeout Management](references/agent_lifecycle.md)**: Subagent lifecycle states, dispatching, timeout handling, and cancellation rules.
- **[Message Protocols & Schemas](references/message_protocols.md)**: Structured envelope formats, asynchronous coordination, and payload specifications.
- **[Tool Capability Matrix](references/tool_matrix.md)**: Comprehensive capability breakdown, security boundaries, and tool whitelist enforcement.

### 2.4 Declarative Subagent Catalog & JSON Schemas (`resources/`)
- **[Subagent Catalog Registry](resources/subagents.json)**: Machine-readable subagent definitions and capability profiles.
- **[Subagent Definition Schema](resources/schemas/subagent_definition.json)**: Formal JSON Schema for validating subagent configurations.
- **[Message Envelope Schema](resources/schemas/message_envelope.json)**: Formal JSON Schema for inter-agent communication envelopes.

### 2.5 Executable Examples (`examples/`)
- **[Architectural Design Example](examples/architectural_design/README.md)**: Step-by-step simulation of adversarial debate and architectural consensus.
- **[Bug Diagnosis Example](examples/bug_diagnosis/README.md)**: Map-Reduce parallel investigation of a tricky concurrency deadlock.

---

## 3. Subagent Tool Capability Matrix

Antigravity enforces strict capability scoping across all subagent archetypes:

| Capability Flag | Planner | Researcher | Critic | Synthesizer | Description |
|---|:---:|:---:|:---:|:---:|---|
| `enable_write_tools` | `false` | `false` | `false` | `true` | Allows editing source files (`write_to_file`, `replace_file_content`). |
| `enable_subagent_tools` | `true` | `false` | `false` | `false` | Allows spawning nested subagents (`invoke_subagent`). |
| `enable_mcp_tools` | `false` | `true` | `false` | `false` | Allows invoking external MCP servers (Composio, GitHub, documentation APIs). |
| `allowed_tools` | Read + Subagent + Schedule | Read + Web + MCP | Read + Inspection | Read + Write + `run_command` | Strict whitelist of permitted tool names. |
| **Workspace Policy** | `.agents/planner_*` | `.agents/researcher_*` | `.agents/critic_*` | `workspace_root` | Filesystem write boundary. |

---

## 4. Operational Directives & Core Invariants

### 4.1 Asynchronous Coordination & Zero-Polling Rule
- Antigravity features a fully event-driven messaging runtime. Subagent dispatch (`invoke_subagent`) and message passing (`send_message`) automatically suspend the sender until a response is delivered.
- **NEVER** run tight polling loops, `sleep` commands, or repeated `status` checks.

### 4.2 5-Component Handoff Protocol
Every subagent completion must generate a `handoff.md` file adhering to the 5-component standard:
1. **Observation**: Exact file paths, line citations (`file:start-end`), verbatim errors, and tool execution logs.
2. **Logic Chain**: Step-by-step deductive reasoning connecting observations to conclusions.
3. **Caveats**: Edge cases not investigated, assumptions made, or external environment unknowns.
4. **Conclusion**: Direct, actionable assessment supporting the next workflow phase.
5. **Verification Method**: Concrete test or build commands (`pytest`, `npm test`, `cargo test`) for independent verification.

### 4.3 Heartbeat & Liveness Protocol
- All agents maintain active liveness by updating `progress.md` in their respective `.agents/<agent_name>/` directories after each major milestone, timestamped with `Last visited: [ISO Timestamp]`.
