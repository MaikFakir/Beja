# Subagent Tool Capability Matrix & Security Invariants

The **Antigravity Multi-Agent Reasoning Framework** enforces strict role-based tool capability boundaries and filesystem access controls across all subagent archetypes. This document specifies the comprehensive tool allocation matrix, capability flags, workspace scoping policies, and security invariants.

---

## 1. Subagent Tool Allocation Matrix

The table below defines the exact tool whitelist permitted for each subagent archetype, strictly enforced by the Antigravity runtime in alignment with [resources/subagents.json](../resources/subagents.json):

| Tool Name | Tool Group | Planner | Researcher | Critic | Synthesizer | Description & Permissions |
|---|---|:---:|:---:|:---:|:---:|---|
| `view_file` | Read / Inspection | Allowed | Allowed | Allowed | Allowed | Inspect file contents (up to 800 lines per call) |
| `grep_search` | Read / Inspection | Allowed | Allowed | Allowed | Allowed | Fast pattern search across codebase using ripgrep |
| `find_by_name` | Read / Inspection | Allowed | Allowed | Allowed | Allowed | Locate files/directories by glob pattern using fd |
| `list_dir` | Read / Inspection | Allowed | Allowed | Allowed | Allowed | Enumerate directory contents and child counts |
| `write_to_file` | Write / Code Mod | Denied | Denied | Denied | Allowed | Create new source code, tests, or overwrite files |
| `replace_file_content` | Write / Code Mod | Denied | Denied | Denied | Allowed | Precise line-level string replacement in source files |
| `run_command` | Execution / Shell | Denied | Denied | Denied | Allowed | Execute build tools, test runners (`pytest`, `npm test`) |
| `invoke_subagent` | Multi-Agent Orchestration | Allowed | Denied | Denied | Denied | Spawn and initialize specialized subagents |
| `send_message` | Coordination | Allowed | Allowed | Allowed | Allowed | Transmit structured message envelopes to parent/subagents |
| `schedule` | Timer & Supervision | Allowed | Denied | Denied | Denied | Register one-shot watchdog timers or recurring crons |
| `manage_task` | Background Process Mgmt | Allowed | Denied | Denied | Allowed | Monitor, send stdin, or terminate background processes |
| `search_web` | External Research (MCP) | Denied | Allowed | Denied | Denied | Search web for API documentation and external libraries |
| `read_url_content` | External Research (MCP) | Denied | Allowed | Denied | Denied | Fetch public documentation and web articles via HTTP |

---

## 2. Boolean Capability Flags & Schema Contract

Every subagent profile in [resources/subagents.json](../resources/subagents.json) declares three boolean capability flags adhering to [Subagent Definition Schema](../resources/schemas/subagent_definition.json):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Boolean Capability Profile                         │
├─────────────────┬────────────────────┬──────────────────┬───────────────────┤
│ Archetype       │ enable_write_tools │ enable_subagent_ │ enable_mcp_tools  │
│                 │ (Source code mod)  │ tools (Spawning) │ (Web / External)  │
├─────────────────┼────────────────────┼──────────────────┼───────────────────┤
│ **Planner**     │ `false`            │ `true`           │ `false`           │
│ **Researcher**  │ `false`            │ `false`          │ `true`            │
│ **Critic**      │ `false`            │ `false`          │ `false`           │
│ **Synthesizer** │ `true`             │ `false`          │ `false`           │
└─────────────────┴────────────────────┴──────────────────┴───────────────────┘
```

### 2.1 `enable_write_tools`
- **Definition**: Grants permission to modify files outside `.agents/<agent_name>/` using `write_to_file` and `replace_file_content`.
- **Security Invariant**: Strictly `false` for Planner, Researcher, and Critic to prevent accidental code mutations, race conditions, or unverified edits. Only the Synthesizer holds `true`.

### 2.2 `enable_subagent_tools`
- **Definition**: Grants permission to spawn child subagents via `invoke_subagent`.
- **Security Invariant**: Strictly `true` for Planners and Orchestrators. Strictly `false` for leaf specialists (Researcher, Critic, Synthesizer) to prevent recursive fork bombs and uncontrolled agent sprawl.

### 2.3 `enable_mcp_tools`
- **Definition**: Grants permission to invoke external Model Context Protocol (MCP) servers and web access tools (`search_web`, `read_url_content`).
- **Security Invariant**: Enabled exclusively for Researcher subagents conducting external documentation queries.

---

## 3. Workspace Scoping & Filesystem Access Policies

Antigravity establishes strict read/write filesystem boundaries for every archetype:

| Archetype | Read Scope Boundary | Write Scope Boundary | Permitted Output Artifacts |
|---|---|---|---|
| **Planner** | `workspace_root` | `.agents/planner_*` | `plan.md`, `dag.json`, `progress.md`, `handoff.md` |
| **Researcher** | `workspace_root` | `.agents/researcher_*` | `findings.md`, `evidence_chain.md`, `progress.md`, `handoff.md` |
| **Critic** | `workspace_root` | `.agents/critic_*` | `critique.md`, `threat_model.md`, `progress.md`, `handoff.md` |
| **Synthesizer** | `workspace_root` | `workspace_root` | Source files, tests, build artifacts, `progress.md`, `handoff.md` |

### Filesystem Isolation Rules:
1. **Metadata Isolation**: The `.agents/` directory is strictly reserved for agent metadata, plans, and intermediate artifacts.
2. **No Code Pollution**: Non-synthesizer agents must NEVER write to application source folders (`src/`, `lib/`, `tests/`).
3. **Clean Workspace Rule**: All temporary scratch files must be cleaned up before task completion.

---

## 4. Security Invariants & Defense-in-Depth

The framework enforces four architectural security invariants:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Principle of Least Privilege                             │
│    Subagents receive the minimum tool set required for      │
│    their specific cognitive role.                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Read-Only Cognitive Isolation                            │
│    Planners, Researchers, and Critics cannot mutate source   │
│    code, guaranteeing untainted analysis and review.        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Fork-Bomb Prevention                                     │
│    Only designated Orchestrators/Planners hold subagent     │
│    creation capabilities.                                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Execution Sandboxing                                     │
│    Shell execution (`run_command`) is restricted to the      │
│    Synthesizer/Implementer role with strict Cwd bounds.     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Related Protocols & References

- **[Subagent Registry Catalog](../resources/subagents.json)**
- **[Subagent Definition JSON Schema](../resources/schemas/subagent_definition.json)**
- **[Inter-Agent Message Protocols](message_protocols.md)**
- **[Subagent Lifecycle Management](agent_lifecycle.md)**
- **[Planner System Prompt](../prompts/planner.md)**
- **[Researcher System Prompt](../prompts/researcher.md)**
- **[Critic System Prompt](../prompts/critic.md)**
- **[Synthesizer System Prompt](../prompts/synthesizer.md)**
