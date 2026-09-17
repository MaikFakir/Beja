# Antigravity Multi-Agent Reasoning Framework

[![Validation Status](https://img.shields.io/badge/Validation-203%2F203%20Passed-success)](#validation--testing)
[![Platform](https://img.shields.io/badge/Antigravity-Skill%20V1.0-blue)](#installation--setup)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](#validation--testing)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade orchestration skill for **Google Antigravity** and autonomous coding agents. This skill partitions complex cognitive workloads across specialized subagents, enforces strict tool permission boundaries, and coordinates execution through four battle-tested reasoning topologies.

---

## 🏛️ Architecture Overview

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

## 👥 Specialized Subagent Archetypes

| Subagent | Role & Focus | Permitted Tools | Write Boundaries |
|---|---|---|---|
| **`planner`** | MECE problem decomposition, DAG dependency formulation, milestone planning | Read-only inspection, nested subagent delegation, scheduling | `.agents/planner_*` |
| **`researcher`** | Codebase exploration, empirical evidence gathering, citation tracking | Read-only inspection, Web search, MCP server integrations | `.agents/researcher_*` |
| **`critic`** | Blind adversarial inspection, STRIDE security analysis, edge-case probing | Read-only inspection, diff verification | `.agents/critic_*` |
| **`synthesizer`** | Cohesive implementation, minimal atomic diff generation, verification loops | Read, Write (`write_to_file`, `replace_file_content`), Terminal execution | `workspace_root` |

---

## 🔄 Reasoning Topologies

The framework dynamically matches problem complexity with the optimal coordination topology:

### 1. Hierarchical Decomposition (`workflows/hierarchical.md`)
- **Use Case**: Complex multi-file features with well-defined specs.
- **Flow**: Orchestrator decomposes problem into a Directed Acyclic Graph (DAG) $\to$ delegates work packages $\to$ aggregates deliverables.

### 2. Debate & Adversarial Review (`workflows/debate.md`)
- **Use Case**: High-stakes architectural decisions, major trade-offs, and critical security refactors.
- **Flow**: Two independent subagents generate competing proposals (Alpha vs. Beta) $\to$ an impartial Critic red-teams both proposals $\to$ Synthesizer produces a consensus architecture.

### 3. Map-Reduce / Parallel Exploration (`workflows/map_reduce.md`)
- **Use Case**: Concurrency issues, elusive heisenbugs, or deep investigation across disparate modules.
- **Flow**: Spawns $N$ parallel Researcher subagents to investigate independent root-cause hypotheses concurrently $\to$ Reducer synthesizes verified root causes.

### 4. Iterative Refinement Loop (`workflows/iterative_loop.md`)
- **Use Case**: Code generation requiring strict invariant satisfaction, unit test convergence, or compiler verification.
- **Flow**: Generator $\to$ Critic $\to$ Verifier loop with hard termination conditions ($\max \text{turns} \le 3$, strict convergence metrics).

---

## 📁 Repository Structure

```
multiagent-reasoning/
├── SKILL.md                 # Antigravity skill specification & instructions
├── README.md                # Framework documentation & overview
├── prompts/                 # Specialized system prompts for subagent archetypes
│   ├── planner.md
│   ├── researcher.md
│   ├── critic.md
│   └── synthesizer.md
├── workflows/               # Step-by-step reasoning topology protocols
│   ├── hierarchical.md
│   ├── debate.md
│   ├── map_reduce.md
│   └── iterative_loop.md
├── references/              # Deep-dive architecture specifications
│   ├── agent_lifecycle.md   # State machines, timeouts, cancellation
│   ├── message_protocols.md # Envelope formats & communication schemas
│   └── tool_matrix.md       # Tool whitelists & capability enforcement
├── resources/               # Declarative schemas and agent catalogs
│   ├── subagents.json       # Machine-readable subagent definitions
│   └── schemas/             # JSON schemas for messages and definitions
├── examples/                # Complete worked examples with simulation scripts
│   ├── architectural_design/
│   └── bug_diagnosis/
├── scripts/                 # Automation and validation tools
│   ├── validate_skill.py    # 4-Tier automated validation suite
│   └── deploy_to_global.py  # Deployment script to Antigravity global config
└── tests/                   # Automated pytest suites
```

---

## 🚀 Installation & Setup

### For Antigravity (Global Customization)
Clone or copy this directory into your global Antigravity skills directory:

```bash
# Windows
git clone <REPO_URL> "%USERPROFILE%\.gemini\config\skills\multiagent-reasoning"

# macOS / Linux
git clone <REPO_URL> "~/.gemini/config/skills/multiagent-reasoning"
```

### For a Specific Workspace
Drop the folder inside your workspace's `.agents/skills/` directory:

```bash
mkdir -p .agents/skills
git clone <REPO_URL> .agents/skills/multiagent-reasoning
```

Once installed, Antigravity will automatically discover and load the skill for complex multi-agent reasoning tasks.

---

## 🧪 Validation & Testing

Run the built-in 4-tier validator to verify all schemas, topologies, and invariants:

```bash
python scripts/validate_skill.py --strict
```

To run the full unit and stress test suite:

```bash
python tests/run_tests.py
```

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
