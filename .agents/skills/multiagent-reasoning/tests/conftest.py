"""
Pytest configuration and test fixtures for Antigravity Multi-Agent Reasoning Framework.
"""

import json
from pathlib import Path
import sys

try:
    import pytest
except ImportError:
    class DummyPytest:
        @staticmethod
        def fixture(*args, **kwargs):
            def decorator(func):
                return func
            return decorator
    pytest = DummyPytest()

# Ensure scripts directory is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from validate_skill import SkillValidator, parse_yaml_frontmatter


@pytest.fixture(scope="session")
def project_root() -> Path:
    """Returns the absolute path to the multiagent_reasoning project root."""
    return PROJECT_ROOT


@pytest.fixture
def mock_valid_skill(tmp_path: Path) -> Path:
    """
    Constructs a pristine, 100% compliant Antigravity Skill directory tree in tmp_path.
    Used for positive tests and as a baseline for mutation/adversarial tests.
    """
    skill_dir = tmp_path / "multiagent-reasoning"
    skill_dir.mkdir(parents=True, exist_ok=True)

    # 1. SKILL.md
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(
        """---
name: multiagent-reasoning
description: >-
  Antigravity Custom Skill for structured multi-agent reasoning workflows.
  Use when tackling complex architectural design, deep debugging, adversarial critique,
  or distributed research across specialized subagents.
---

# Multi-Agent Reasoning Framework

Step-by-step guidance for activating and coordinating specialized subagents.

## Available Workflows
- [Hierarchical Protocol](workflows/hierarchical.md)
- [Adversarial Debate](workflows/debate.md)
- [Parallel Map-Reduce](workflows/map_reduce.md)
- [Iterative Refinement](workflows/iterative_loop.md)

## Subagent Definitions
Refer to [Subagent Registry](resources/subagents.json) and prompts:
- [Planner Prompt](prompts/planner.md)
- [Researcher Prompt](prompts/researcher.md)
- [Critic Prompt](prompts/critic.md)
- [Synthesizer Prompt](prompts/synthesizer.md)
""",
        encoding="utf-8",
    )

    # 2. Prompts
    prompts_dir = skill_dir / "prompts"
    prompts_dir.mkdir(parents=True, exist_ok=True)

    prompt_templates = {
        "planner.md": """# Planner / Architect Subagent Prompt
## Role & Identity
You are the Planner. Decomposes tasks into DAG dependency graphs.
## Capabilities & Permissions
- enable_write_tools: false
- enable_subagent_tools: true
- enable_mcp_tools: false
## Input Contract
Receives task objective and constraints.
## Output Contract & Handoff
Generates execution plan written to `.agents/planner/plan.md`.
""",
        "researcher.md": """# Researcher / Explorer Subagent Prompt
## Role & Identity
You are the Researcher. Explores codebase and documentation without modifying files.
## Capabilities & Permissions
- enable_write_tools: false
- enable_subagent_tools: false
- enable_mcp_tools: true
## Input Contract
Receives research hypotheses and target directories.
## Output Contract & Handoff
Generates evidence chain in `.agents/researcher/findings.md`.
""",
        "critic.md": """# Critic / Reviewer Subagent Prompt
## Role & Identity
You are the Critic. Performs blind adversarial inspection and identifies edge cases.
## Capabilities & Permissions
- enable_write_tools: false
- enable_subagent_tools: false
- enable_mcp_tools: false
## Input Contract
Receives proposals or implementation diffs.
## Output Contract & Handoff
Generates critique report in `.agents/critic/critique.md`.
""",
        "synthesizer.md": """# Synthesizer / Implementer Subagent Prompt
## Role & Identity
You are the Synthesizer. Translates verified designs into production code.
## Capabilities & Permissions
- enable_write_tools: true
- enable_subagent_tools: false
- enable_mcp_tools: false
## Input Contract
Receives verified architectural plan and critique feedback.
## Output Contract & Handoff
Writes source code and executes verification test suites.
""",
    }

    for fname, pcontent in prompt_templates.items():
        (prompts_dir / fname).write_text(pcontent, encoding="utf-8")

    # 3. Workflows
    wf_dir = skill_dir / "workflows"
    wf_dir.mkdir(parents=True, exist_ok=True)

    wf_templates = {
        "hierarchical.md": """# Hierarchical Decomposition Protocol
```mermaid
stateDiagram-v2
    [*] --> DECOMPOSING
    DECOMPOSING --> DISPATCHING
    DISPATCHING --> AWAITING_SUBAGENTS
    AWAITING_SUBAGENTS --> SYNTHESIZING
    SYNTHESIZING --> [*]
```
| Current State | Event | Next State |
|---|---|---|
| IDLE | Start | DECOMPOSING |
| DECOMPOSING | DAG Built | DISPATCHING |

Uses reactive wakeups without polling.
""",
        "debate.md": """# Debate & Adversarial Peer Review Protocol
```mermaid
stateDiagram-v2
    [*] --> BLIND_GENERATION
    BLIND_GENERATION --> CRITIC_REVIEW
    CRITIC_REVIEW --> ARBITRATION
    ARBITRATION --> [*]
```
| Current State | Event | Next State |
|---|---|---|
| BLIND_GENERATION | Proposals Done | CRITIC_REVIEW |
""",
        "map_reduce.md": """# Map-Reduce Parallel Exploration Protocol
```mermaid
stateDiagram-v2
    [*] --> PARTITIONING
    PARTITIONING --> EXPLORING
    EXPLORING --> REDUCING
    REDUCING --> [*]
```
| Current State | Event | Next State |
|---|---|---|
| PARTITIONING | Scopes Ready | EXPLORING |
""",
        "iterative_loop.md": """# Iterative Refinement Loop Protocol
```mermaid
stateDiagram-v2
    [*] --> GENERATE
    GENERATE --> CRITIQUE
    CRITIQUE --> VERIFY
    VERIFY --> GENERATE : Incomplete
    VERIFY --> COMPLETED : Invariant Satisfied
```
| Current State | Event | Next State |
|---|---|---|
| GENERATE | Draft Ready | CRITIQUE |
| CRITIQUE | Feedback Given | VERIFY |
| VERIFY | Tests Pass | COMPLETED |

## Stopping Criteria & Invariants
- Maximum iterations: 5 rounds
- Loop terminates on invariant satisfaction or budget exhaustion.
""",
    }

    for fname, wcontent in wf_templates.items():
        (wf_dir / fname).write_text(wcontent, encoding="utf-8")

    # 4. References
    ref_dir = skill_dir / "references"
    ref_dir.mkdir(parents=True, exist_ok=True)

    ref_templates = {
        "agent_lifecycle.md": """# Agent Lifecycle Management
Covers spawn, reactive execution, and teardown.
""",
        "message_protocols.md": """# Message Passing Envelope Protocol
Structured message formats require:
- **Context**: Task ID and workflow node
- **Content**: Summary of work
- **Action**: Expected response
- **Payload**: Artifact paths

Reactive wakeups ensure zero polling loops.
""",
        "tool_matrix.md": """# Subagent Tool Matrix & Permissions
Matrix of allowed tools per archetype.
""",
    }

    for fname, rcontent in ref_templates.items():
        (ref_dir / fname).write_text(rcontent, encoding="utf-8")

    # 5. Resources & subagents.json
    res_dir = skill_dir / "resources"
    res_dir.mkdir(parents=True, exist_ok=True)

    subagents_json_content = {
        "subagent_definitions": {
            "planner": {
                "role": "Planner",
                "description": "Decomposes complex problems into dependency graphs",
                "capabilities": {
                    "enable_write_tools": False,
                    "enable_subagent_tools": True,
                    "enable_mcp_tools": False,
                    "allowed_tools": ["view_file", "grep_search", "invoke_subagent", "send_message"],
                },
                "workspace_policy": {
                    "read_scope": "workspace_root",
                    "write_scope": ".agents/planner_*",
                },
                "system_prompt_ref": "prompts/planner.md",
            },
            "researcher": {
                "role": "Researcher",
                "description": "Performs deep codebase exploration and web search",
                "capabilities": {
                    "enable_write_tools": False,
                    "enable_subagent_tools": False,
                    "enable_mcp_tools": True,
                    "allowed_tools": ["view_file", "grep_search", "search_web", "send_message"],
                },
                "workspace_policy": {
                    "read_scope": "workspace_root",
                    "write_scope": ".agents/researcher_*",
                },
                "system_prompt_ref": "prompts/researcher.md",
            },
            "critic": {
                "role": "Critic",
                "description": "Performs adversarial inspection and edge-case testing",
                "capabilities": {
                    "enable_write_tools": False,
                    "enable_subagent_tools": False,
                    "enable_mcp_tools": False,
                    "allowed_tools": ["view_file", "grep_search", "send_message"],
                },
                "workspace_policy": {
                    "read_scope": "workspace_root",
                    "write_scope": ".agents/critic_*",
                },
                "system_prompt_ref": "prompts/critic.md",
            },
            "synthesizer": {
                "role": "Synthesizer",
                "description": "Translates plans and critiques into tested code",
                "capabilities": {
                    "enable_write_tools": True,
                    "enable_subagent_tools": False,
                    "enable_mcp_tools": False,
                    "allowed_tools": ["view_file", "write_to_file", "replace_file_content", "run_command", "send_message"],
                },
                "workspace_policy": {
                    "read_scope": "workspace_root",
                    "write_scope": "workspace_root",
                },
                "system_prompt_ref": "prompts/synthesizer.md",
            },
        }
    }
    (res_dir / "subagents.json").write_text(json.dumps(subagents_json_content, indent=2), encoding="utf-8")

    # 6. Examples
    for scenario in ["architectural_design", "bug_diagnosis"]:
        ex_dir = skill_dir / "examples" / scenario
        ex_dir.mkdir(parents=True, exist_ok=True)
        (ex_dir / "README.md").write_text(
            f"# {scenario.replace('_', ' ').title()} Example\nComprehensive walkthrough for {scenario} simulation.\n",
            encoding="utf-8",
        )
        (ex_dir / "run_example.py").write_text(
            f"""#!/usr/bin/env python3
'''Simulation runner for {scenario}'''
def run_simulation():
    print('Running {scenario} simulation')
    return True

if __name__ == '__main__':
    run_simulation()
""",
            encoding="utf-8",
        )

    return skill_dir
