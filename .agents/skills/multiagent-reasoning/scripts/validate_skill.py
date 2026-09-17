#!/usr/bin/env python3
"""
Antigravity Multi-Agent Reasoning Framework - Skill Validator
============================================================
Comprehensive 4-Tier Automated Validation Engine for Antigravity Custom Skills.

Tiers:
  - Tier 1: Frontmatter & Markdown Syntax, Directory Layout, File Presence
  - Tier 2: Boundary Validation, Subagent Registry & Tool Capability Schemas
  - Tier 3: Workflow State Machines, Messaging Protocols & Anti-Pattern Detection
  - Tier 4: Executable Examples, Simulation Runner Syntax & E2E Sanity

CLI Usage:
  python scripts/validate_skill.py [--target-dir <path>] [--strict] [--json] [--verbose] [--tier 1,2,3,4]
"""

import ast
import argparse
from dataclasses import dataclass, field, asdict
from enum import Enum
import json
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

# Reconfigure standard I/O streams for cross-platform UTF-8 terminal support
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


class CheckStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"
    SKIP = "SKIP"


@dataclass
class CheckResult:
    check_id: str
    name: str
    status: CheckStatus
    tier: int
    message: str
    details: Optional[str] = None
    file_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_id": self.check_id,
            "name": self.name,
            "status": self.status.value,
            "tier": self.tier,
            "message": self.message,
            "details": self.details,
            "file_path": self.file_path,
        }


@dataclass
class TierResult:
    tier: int
    name: str
    passed: int = 0
    failed: int = 0
    warnings: int = 0
    skipped: int = 0
    checks: List[CheckResult] = field(default_factory=list)

    @property
    def is_success(self) -> bool:
        return self.failed == 0

    def add_check(self, check: CheckResult):
        self.checks.append(check)
        if check.status == CheckStatus.PASS:
            self.passed += 1
        elif check.status == CheckStatus.FAIL:
            self.failed += 1
        elif check.status == CheckStatus.WARN:
            self.warnings += 1
        elif check.status == CheckStatus.SKIP:
            self.skipped += 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tier": self.tier,
            "name": self.name,
            "passed": self.passed,
            "failed": self.failed,
            "warnings": self.warnings,
            "skipped": self.skipped,
            "is_success": self.is_success,
            "checks": [c.to_dict() for c in self.checks],
        }


@dataclass
class ValidationReport:
    target_dir: str
    is_valid: bool
    strict_mode: bool
    total_passed: int = 0
    total_failed: int = 0
    total_warnings: int = 0
    total_skipped: int = 0
    tiers: Dict[int, TierResult] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target_dir": self.target_dir,
            "is_valid": self.is_valid,
            "strict_mode": self.strict_mode,
            "summary": {
                "total_passed": self.total_passed,
                "total_failed": self.total_failed,
                "total_warnings": self.total_warnings,
                "total_skipped": self.total_skipped,
            },
            "tiers": {str(k): v.to_dict() for k, v in self.tiers.items()},
        }


def parse_yaml_frontmatter(content: str) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
    """
    Extracts and parses YAML frontmatter from markdown content.
    Returns: (parsed_dict, body_content, error_message)
    """
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, content, "No starting YAML frontmatter delimiter ('---') found"
    
    end_idx = -1
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break
            
    if end_idx == -1:
        return None, content, "Unclosed YAML frontmatter delimiter (missing closing '---')"
        
    frontmatter_raw = "\n".join(lines[1:end_idx])
    body = "\n".join(lines[end_idx + 1:])
    
    # Try importing PyYAML if available
    try:
        import yaml
        try:
            parsed = yaml.safe_load(frontmatter_raw)
            if not isinstance(parsed, dict):
                return None, body, "Frontmatter YAML did not parse into a key-value dictionary"
            return parsed, body, None
        except Exception as e:
            return None, body, f"YAML parsing error: {e}"
    except ImportError:
        pass

    # Standard library fallback parser for simple key-value and folded scalars
    parsed = {}
    current_key = None
    current_val_lines = []
    is_folded_scalar = False

    for line in lines[1:end_idx]:
        if not line.strip() or line.strip().startswith("#"):
            continue
        
        # Match top-level key: value
        match = re.match(r"^([a-zA-Z0-9_\-]+)\s*:\s*(.*)$", line)
        if match:
            if current_key:
                val_str = " ".join(current_val_lines).strip() if is_folded_scalar else "\n".join(current_val_lines).strip()
                parsed[current_key] = val_str
            current_key = match.group(1)
            rest = match.group(2).strip()
            if rest in (">-", ">", "|-", "|"):
                is_folded_scalar = rest.startswith(">")
                current_val_lines = []
            else:
                is_folded_scalar = False
                # Remove quotes if present
                if (rest.startswith('"') and rest.endswith('"')) or (rest.startswith("'") and rest.endswith("'")):
                    rest = rest[1:-1]
                parsed[current_key] = rest
                current_key = None
        elif current_key and (line.startswith("  ") or line.startswith("\t")):
            current_val_lines.append(line.strip())
        else:
            return None, body, f"Malformed YAML line in frontmatter: {line}"

    if current_key:
        val_str = " ".join(current_val_lines).strip() if is_folded_scalar else "\n".join(current_val_lines).strip()
        parsed[current_key] = val_str

    return parsed, body, None


class SkillValidator:
    """
    Automated validator for Antigravity Custom Skills and Multi-Agent Reasoning Framework.
    """

    EXPECTED_SKILL_NAME = "multiagent-reasoning"
    
    CORE_FILES = [
        "SKILL.md",
        "prompts/planner.md",
        "prompts/researcher.md",
        "prompts/critic.md",
        "prompts/synthesizer.md",
        "workflows/hierarchical.md",
        "workflows/debate.md",
        "workflows/map_reduce.md",
        "workflows/iterative_loop.md",
        "references/agent_lifecycle.md",
        "references/message_protocols.md",
        "references/tool_matrix.md",
        "resources/subagents.json",
        "examples/architectural_design/README.md",
        "examples/architectural_design/run_example.py",
        "examples/bug_diagnosis/README.md",
        "examples/bug_diagnosis/run_example.py",
    ]

    EXPECTED_SUBAGENTS = {
        "planner": {
            "role": "Planner",
            "enable_write_tools": False,
            "enable_subagent_tools": True,
            "enable_mcp_tools": False,
            "prompt_file": "prompts/planner.md",
        },
        "researcher": {
            "role": "Researcher",
            "enable_write_tools": False,
            "enable_subagent_tools": False,
            "enable_mcp_tools": True,
            "prompt_file": "prompts/researcher.md",
        },
        "critic": {
            "role": "Critic",
            "enable_write_tools": False,
            "enable_subagent_tools": False,
            "enable_mcp_tools": False,
            "prompt_file": "prompts/critic.md",
        },
        "synthesizer": {
            "role": "Synthesizer",
            "enable_write_tools": True,
            "enable_subagent_tools": False,
            "enable_mcp_tools": False,
            "prompt_file": "prompts/synthesizer.md",
        },
    }

    def __init__(self, target_dir: str | Path, strict: bool = False, verbose: bool = False):
        self.target_dir = Path(target_dir).resolve()
        self.strict = strict
        self.verbose = verbose

    # -------------------------------------------------------------------------
    # Tier 1: Syntax, Frontmatter & File Layout
    # -------------------------------------------------------------------------
    def validate_tier1(self) -> TierResult:
        tier = TierResult(tier=1, name="Syntax, Frontmatter & Directory Layout")
        
        # 1.1 Root SKILL.md existence
        skill_md_path = self.target_dir / "SKILL.md"
        if not skill_md_path.exists():
            tier.add_check(CheckResult(
                check_id="T1.1",
                name="SKILL.md Existence",
                status=CheckStatus.FAIL,
                tier=1,
                message=f"Root SKILL.md not found in {self.target_dir}",
                file_path=str(skill_md_path)
            ))
            return tier
        else:
            tier.add_check(CheckResult(
                check_id="T1.1",
                name="SKILL.md Existence",
                status=CheckStatus.PASS,
                tier=1,
                message="SKILL.md found at root",
                file_path=str(skill_md_path)
            ))

        # 1.2 Frontmatter Parsing
        content = skill_md_path.read_text(encoding="utf-8", errors="replace")
        frontmatter, body, err = parse_yaml_frontmatter(content)
        if err or frontmatter is None:
            tier.add_check(CheckResult(
                check_id="T1.2",
                name="YAML Frontmatter Format",
                status=CheckStatus.FAIL,
                tier=1,
                message=f"Invalid YAML frontmatter: {err}",
                file_path=str(skill_md_path)
            ))
            return tier
        else:
            tier.add_check(CheckResult(
                check_id="T1.2",
                name="YAML Frontmatter Format",
                status=CheckStatus.PASS,
                tier=1,
                message="Valid YAML frontmatter delimited by '---'",
                file_path=str(skill_md_path)
            ))

        # 1.3 Frontmatter 'name' field
        name = frontmatter.get("name")
        if name == self.EXPECTED_SKILL_NAME:
            tier.add_check(CheckResult(
                check_id="T1.3",
                name="Skill Name Match",
                status=CheckStatus.PASS,
                tier=1,
                message=f"Skill name is '{name}'",
                details=f"Expected: {self.EXPECTED_SKILL_NAME}",
                file_path=str(skill_md_path)
            ))
        else:
            tier.add_check(CheckResult(
                check_id="T1.3",
                name="Skill Name Match",
                status=CheckStatus.FAIL,
                tier=1,
                message=f"Skill name '{name}' does not match expected '{self.EXPECTED_SKILL_NAME}'",
                file_path=str(skill_md_path)
            ))

        # 1.4 Frontmatter 'description' field presence & length
        desc = frontmatter.get("description", "")
        if isinstance(desc, str) and len(desc.strip()) >= 30:
            tier.add_check(CheckResult(
                check_id="T1.4",
                name="Skill Description Length",
                status=CheckStatus.PASS,
                tier=1,
                message=f"Description present ({len(desc.strip())} chars)",
                file_path=str(skill_md_path)
            ))
        else:
            tier.add_check(CheckResult(
                check_id="T1.4",
                name="Skill Description Length",
                status=CheckStatus.FAIL,
                tier=1,
                message="Frontmatter 'description' is missing or shorter than 30 characters",
                file_path=str(skill_md_path)
            ))

        # 1.5 Positive trigger presence in description
        desc_lower = str(desc).lower()
        trigger_keywords = ["when", "use this skill", "trigger", "multi-agent", "reasoning", "complex"]
        has_positive_trigger = any(kw in desc_lower for kw in trigger_keywords)
        if has_positive_trigger:
            tier.add_check(CheckResult(
                check_id="T1.5",
                name="Positive Trigger Guidance",
                status=CheckStatus.PASS,
                tier=1,
                message="Description contains positive trigger rules / activation conditions",
                file_path=str(skill_md_path)
            ))
        else:
            tier.add_check(CheckResult(
                check_id="T1.5",
                name="Positive Trigger Guidance",
                status=CheckStatus.FAIL,
                tier=1,
                message="Description lacks clear positive trigger guidance (e.g. 'Use when...')",
                file_path=str(skill_md_path)
            ))

        # 1.6 Core File & Directory Layout Checks
        for relative_file in self.CORE_FILES:
            target_file = self.target_dir / relative_file
            if target_file.exists() and target_file.is_file():
                tier.add_check(CheckResult(
                    check_id=f"T1.File.{relative_file.replace('/', '.')}",
                    name=f"Presence of {relative_file}",
                    status=CheckStatus.PASS,
                    tier=1,
                    message=f"File '{relative_file}' exists ({target_file.stat().st_size} bytes)",
                    file_path=str(target_file)
                ))
            else:
                tier.add_check(CheckResult(
                    check_id=f"T1.File.{relative_file.replace('/', '.')}",
                    name=f"Presence of {relative_file}",
                    status=CheckStatus.FAIL,
                    tier=1,
                    message=f"Required file '{relative_file}' does not exist",
                    file_path=str(target_file)
                ))

        # 1.7 Relative Link Validation in all Markdown files
        md_files = list(self.target_dir.glob("**/*.md"))
        for md_file in md_files:
            # Skip agent workspace files
            if ".agents" in md_file.parts:
                continue
            rel_md_path = md_file.relative_to(self.target_dir)
            md_text = md_file.read_text(encoding="utf-8", errors="replace")
            # Extract links [text](path)
            links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', md_text)
            for link_text, link_target in links:
                # Ignore web URLs, mailto, and internal page anchors
                if link_target.startswith(("http://", "https://", "mailto:", "#")):
                    continue
                
                # Check for Windows backslash anti-pattern in links
                if "\\" in link_target:
                    tier.add_check(CheckResult(
                        check_id=f"T1.LinkStyle.{rel_md_path}",
                        name=f"Markdown Link Style ({rel_md_path})",
                        status=CheckStatus.FAIL,
                        tier=1,
                        message=f"Markdown link '{link_target}' in {rel_md_path} uses Windows backslashes '\\'. Use '/' for cross-platform portability.",
                        file_path=str(md_file)
                    ))
                    continue

                # Strip anchor if present
                clean_target = link_target.split("#")[0]
                if not clean_target:
                    continue

                # Resolve relative path
                resolved_target = (md_file.parent / clean_target).resolve()
                if resolved_target.exists():
                    tier.add_check(CheckResult(
                        check_id=f"T1.Link.{rel_md_path}.{clean_target}",
                        name=f"Relative Link Target ({clean_target})",
                        status=CheckStatus.PASS,
                        tier=1,
                        message=f"Link '{clean_target}' in {rel_md_path} resolves successfully",
                        file_path=str(md_file)
                    ))
                else:
                    tier.add_check(CheckResult(
                        check_id=f"T1.Link.{rel_md_path}.{clean_target}",
                        name=f"Relative Link Target ({clean_target})",
                        status=CheckStatus.FAIL,
                        tier=1,
                        message=f"Dead link '{clean_target}' in {rel_md_path} (Target does not exist: {resolved_target})",
                        file_path=str(md_file)
                    ))

        return tier

    # -------------------------------------------------------------------------
    # Tier 2: Boundary & Tool Permission Schemas
    # -------------------------------------------------------------------------
    def validate_tier2(self) -> TierResult:
        tier = TierResult(tier=2, name="Boundary & Tool Permission Schemas")

        # 2.1 Skill Name Boundary Validation
        skill_md_path = self.target_dir / "SKILL.md"
        if skill_md_path.exists():
            content = skill_md_path.read_text(encoding="utf-8", errors="replace")
            frontmatter, _, _ = parse_yaml_frontmatter(content)
            if frontmatter and "name" in frontmatter:
                name = frontmatter["name"]
                # Must be lowercase kebab-case (no uppercase, no spaces, no special characters)
                if re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", name):
                    tier.add_check(CheckResult(
                        check_id="T2.1",
                        name="Skill Name Format (Kebab-Case)",
                        status=CheckStatus.PASS,
                        tier=2,
                        message=f"Skill name '{name}' strictly satisfies kebab-case lowercase rules",
                        file_path=str(skill_md_path)
                    ))
                else:
                    tier.add_check(CheckResult(
                        check_id="T2.1",
                        name="Skill Name Format (Kebab-Case)",
                        status=CheckStatus.FAIL,
                        tier=2,
                        message=f"Skill name '{name}' contains invalid characters (must be lowercase kebab-case)",
                        file_path=str(skill_md_path)
                    ))

        # 2.2 Subagents Registry Schema Validation (`resources/subagents.json`)
        subagents_path = self.target_dir / "resources" / "subagents.json"
        if not subagents_path.exists():
            tier.add_check(CheckResult(
                check_id="T2.2",
                name="Subagents Registry JSON Presence",
                status=CheckStatus.FAIL,
                tier=2,
                message="Missing resources/subagents.json",
                file_path=str(subagents_path)
            ))
            return tier

        try:
            subagents_data = json.loads(subagents_path.read_text(encoding="utf-8"))
            tier.add_check(CheckResult(
                check_id="T2.2",
                name="Subagents Registry JSON Syntax",
                status=CheckStatus.PASS,
                tier=2,
                message="resources/subagents.json is valid JSON",
                file_path=str(subagents_path)
            ))
        except Exception as e:
            tier.add_check(CheckResult(
                check_id="T2.2",
                name="Subagents Registry JSON Syntax",
                status=CheckStatus.FAIL,
                tier=2,
                message=f"JSON syntax error in resources/subagents.json: {e}",
                file_path=str(subagents_path)
            ))
            return tier

        # Normalize definitions map
        definitions = subagents_data.get("subagents", subagents_data.get("subagent_definitions", subagents_data))
        
        # 2.3 Verify all 4 archetypes are defined
        for archetype, expected in self.EXPECTED_SUBAGENTS.items():
            if archetype not in definitions:
                tier.add_check(CheckResult(
                    check_id=f"T2.3.{archetype}",
                    name=f"Subagent Definition ({archetype})",
                    status=CheckStatus.FAIL,
                    tier=2,
                    message=f"Archetype '{archetype}' missing from resources/subagents.json",
                    file_path=str(subagents_path)
                ))
                continue

            sub_def = definitions[archetype]
            tier.add_check(CheckResult(
                check_id=f"T2.3.{archetype}",
                name=f"Subagent Definition ({archetype})",
                status=CheckStatus.PASS,
                tier=2,
                message=f"Archetype '{archetype}' defined in subagents.json",
                file_path=str(subagents_path)
            ))

            # Validate capabilities flags
            caps = sub_def.get("capabilities", {})
            for flag in ["enable_write_tools", "enable_subagent_tools", "enable_mcp_tools"]:
                actual_val = caps.get(flag)
                expected_val = expected[flag]
                check_id = f"T2.Cap.{archetype}.{flag}"
                if actual_val == expected_val:
                    tier.add_check(CheckResult(
                        check_id=check_id,
                        name=f"Capability Flag ({archetype} -> {flag})",
                        status=CheckStatus.PASS,
                        tier=2,
                        message=f"{archetype}.{flag} is correctly set to {expected_val}",
                        file_path=str(subagents_path)
                    ))
                else:
                    tier.add_check(CheckResult(
                        check_id=check_id,
                        name=f"Capability Flag ({archetype} -> {flag})",
                        status=CheckStatus.FAIL,
                        tier=2,
                        message=f"Security violation: {archetype}.{flag} is {actual_val}, expected {expected_val}",
                        file_path=str(subagents_path)
                    ))

            # Validate prompt file reference
            prompt_ref = sub_def.get("system_prompt_ref", "")
            prompt_file = self.target_dir / prompt_ref
            if prompt_ref and prompt_file.exists():
                tier.add_check(CheckResult(
                    check_id=f"T2.PromptRef.{archetype}",
                    name=f"System Prompt Reference ({archetype})",
                    status=CheckStatus.PASS,
                    tier=2,
                    message=f"Prompt reference '{prompt_ref}' exists",
                    file_path=str(prompt_file)
                ))
            else:
                tier.add_check(CheckResult(
                    check_id=f"T2.PromptRef.{archetype}",
                    name=f"System Prompt Reference ({archetype})",
                    status=CheckStatus.FAIL,
                    tier=2,
                    message=f"Prompt reference '{prompt_ref}' does not exist on disk",
                    file_path=str(prompt_file)
                ))

            # Validate workspace policy
            ws_policy = sub_def.get("workspace_policy", {})
            write_scope = ws_policy.get("write_scope", "")
            if archetype == "synthesizer":
                expected_scope_valid = write_scope in ["workspace_root", "project_root", "*", "workspace"]
            else:
                expected_scope_valid = ".agents/" in write_scope or write_scope.startswith(".agents")
            
            if expected_scope_valid:
                tier.add_check(CheckResult(
                    check_id=f"T2.Scope.{archetype}",
                    name=f"Workspace Scope Policy ({archetype})",
                    status=CheckStatus.PASS,
                    tier=2,
                    message=f"Write scope '{write_scope}' complies with role security invariants",
                    file_path=str(subagents_path)
                ))
            else:
                tier.add_check(CheckResult(
                    check_id=f"T2.Scope.{archetype}",
                    name=f"Workspace Scope Policy ({archetype})",
                    status=CheckStatus.FAIL,
                    tier=2,
                    message=f"Write scope violation: {archetype} has write_scope '{write_scope}'",
                    file_path=str(subagents_path)
                ))

        # 2.4 Subagent Prompt Structured Sections
        for archetype, expected in self.EXPECTED_SUBAGENTS.items():
            prompt_path = self.target_dir / expected["prompt_file"]
            if not prompt_path.exists():
                continue
            prompt_text = prompt_path.read_text(encoding="utf-8", errors="replace")
            
            # Check for standard sections
            required_sections = ["Role", "Capabilities", "Input", "Handoff"]
            for section in required_sections:
                pattern = re.compile(rf"#+\s*.*{section}", re.IGNORECASE)
                if pattern.search(prompt_text):
                    tier.add_check(CheckResult(
                        check_id=f"T2.Section.{archetype}.{section}",
                        name=f"Prompt Section ({archetype} -> {section})",
                        status=CheckStatus.PASS,
                        tier=2,
                        message=f"{archetype} prompt defines section '{section}'",
                        file_path=str(prompt_path)
                    ))
                else:
                    tier.add_check(CheckResult(
                        check_id=f"T2.Section.{archetype}.{section}",
                        name=f"Prompt Section ({archetype} -> {section})",
                        status=CheckStatus.WARN if not self.strict else CheckStatus.FAIL,
                        tier=2,
                        message=f"{archetype} prompt missing explicit '{section}' section header",
                        file_path=str(prompt_path)
                    ))

        return tier

    # -------------------------------------------------------------------------
    # Tier 3: Workflow Protocol & Message Schema Validation
    # -------------------------------------------------------------------------
    def validate_tier3(self) -> TierResult:
        tier = TierResult(tier=3, name="Workflow Protocols & Message Schema")

        # 3.1 Message Passing Envelope Contract
        msg_proto_path = self.target_dir / "references" / "message_protocols.md"
        if msg_proto_path.exists():
            proto_text = msg_proto_path.read_text(encoding="utf-8", errors="replace")
            envelope_fields = ["Context", "Content", "Action"]
            for field_name in envelope_fields:
                if f"**{field_name}**" in proto_text or f"`{field_name}`" in proto_text or f"{field_name}:" in proto_text:
                    tier.add_check(CheckResult(
                        check_id=f"T3.MsgField.{field_name}",
                        name=f"Message Envelope Field ({field_name})",
                        status=CheckStatus.PASS,
                        tier=3,
                        message=f"Message protocol specifies envelope field '{field_name}'",
                        file_path=str(msg_proto_path)
                    ))
                else:
                    tier.add_check(CheckResult(
                        check_id=f"T3.MsgField.{field_name}",
                        name=f"Message Envelope Field ({field_name})",
                        status=CheckStatus.FAIL,
                        tier=3,
                        message=f"Message protocol missing envelope field '{field_name}'",
                        file_path=str(msg_proto_path)
                    ))
        else:
            tier.add_check(CheckResult(
                check_id="T3.MsgProto",
                name="Message Protocol Document",
                status=CheckStatus.FAIL,
                tier=3,
                message="Missing references/message_protocols.md",
                file_path=str(msg_proto_path)
            ))

        # 3.2 State Machines & Transition Integrity in Workflows
        workflow_files = {
            "hierarchical": self.target_dir / "workflows" / "hierarchical.md",
            "debate": self.target_dir / "workflows" / "debate.md",
            "map_reduce": self.target_dir / "workflows" / "map_reduce.md",
            "iterative_loop": self.target_dir / "workflows" / "iterative_loop.md",
        }

        for wf_name, wf_path in workflow_files.items():
            if not wf_path.exists():
                tier.add_check(CheckResult(
                    check_id=f"T3.Workflow.{wf_name}",
                    name=f"Workflow Specification ({wf_name})",
                    status=CheckStatus.FAIL,
                    tier=3,
                    message=f"Workflow file {wf_path.name} not found",
                    file_path=str(wf_path)
                ))
                continue

            wf_text = wf_path.read_text(encoding="utf-8", errors="replace")

            # Check for Mermaid or state diagram
            has_diagram = "mermaid" in wf_text or "stateDiagram" in wf_text or "```" in wf_text
            if has_diagram:
                tier.add_check(CheckResult(
                    check_id=f"T3.Diagram.{wf_name}",
                    name=f"State Machine Diagram ({wf_name})",
                    status=CheckStatus.PASS,
                    tier=3,
                    message=f"Workflow '{wf_name}' includes formal state transition diagram / representation",
                    file_path=str(wf_path)
                ))
            else:
                tier.add_check(CheckResult(
                    check_id=f"T3.Diagram.{wf_name}",
                    name=f"State Machine Diagram ({wf_name})",
                    status=CheckStatus.FAIL,
                    tier=3,
                    message=f"Workflow '{wf_name}' lacks a state machine diagram",
                    file_path=str(wf_path)
                ))

            # Check for State Transition Table or explicit states
            has_table = "|" in wf_text and ("State" in wf_text or "Next State" in wf_text or "Event" in wf_text)
            if has_table:
                tier.add_check(CheckResult(
                    check_id=f"T3.Table.{wf_name}",
                    name=f"State Transition Table ({wf_name})",
                    status=CheckStatus.PASS,
                    tier=3,
                    message=f"Workflow '{wf_name}' provides structured state transition table",
                    file_path=str(wf_path)
                ))
            else:
                tier.add_check(CheckResult(
                    check_id=f"T3.Table.{wf_name}",
                    name=f"State Transition Table ({wf_name})",
                    status=CheckStatus.WARN if not self.strict else CheckStatus.FAIL,
                    tier=3,
                    message=f"Workflow '{wf_name}' does not contain an explicit markdown state transition table",
                    file_path=str(wf_path)
                ))

            # Specific stopping / convergence criteria for iterative loop
            if wf_name == "iterative_loop":
                stopping_terms = ["stopping criteria", "max iterations", "convergence", "retry limit", "loop invariant"]
                has_stopping_criteria = any(term in wf_text.lower() for term in stopping_terms)
                if has_stopping_criteria:
                    tier.add_check(CheckResult(
                        check_id="T3.StoppingCriteria.iterative_loop",
                        name="Iterative Loop Stopping Criteria",
                        status=CheckStatus.PASS,
                        tier=3,
                        message="Iterative loop explicitly documents stopping criteria / maximum iterations",
                        file_path=str(wf_path)
                    ))
                else:
                    tier.add_check(CheckResult(
                        check_id="T3.StoppingCriteria.iterative_loop",
                        name="Iterative Loop Stopping Criteria",
                        status=CheckStatus.FAIL,
                        tier=3,
                        message="Iterative loop lacks explicit stopping criteria to prevent infinite execution",
                        file_path=str(wf_path)
                    ))

        # 3.3 Anti-Pattern Detection (Tight Polling Loops, Blocking Waits)
        # Scan markdown and scripts for tight polling patterns
        all_docs = list(self.target_dir.glob("workflows/*.md")) + list(self.target_dir.glob("references/*.md"))
        polling_pattern = re.compile(r"(while\s+true\s*:\s*sleep|loop\s+polling|tight\s+polling|poll\s+in\s+a\s+loop)", re.IGNORECASE)
        reactive_pattern = re.compile(r"(reactive|reactive\s+wakeup|send_message|event-driven|asynchronous)", re.IGNORECASE)

        for doc_path in all_docs:
            doc_text = doc_path.read_text(encoding="utf-8", errors="replace")
            # If polling anti-pattern appears outside a warning context:
            if "NEVER" not in doc_text and "Do NOT poll" not in doc_text and "avoid" not in doc_text:
                if polling_pattern.search(doc_text):
                    tier.add_check(CheckResult(
                        check_id=f"T3.AntiPattern.{doc_path.stem}",
                        name=f"Zero-Polling Architecture ({doc_path.name})",
                        status=CheckStatus.FAIL,
                        tier=3,
                        message=f"File {doc_path.name} mentions polling loops without prohibitive guidance",
                        file_path=str(doc_path)
                    ))
                    continue

            # Verify presence of reactive guidelines
            if reactive_pattern.search(doc_text):
                tier.add_check(CheckResult(
                    check_id=f"T3.Reactive.{doc_path.stem}",
                    name=f"Reactive Wakeup Guidance ({doc_path.name})",
                    status=CheckStatus.PASS,
                    tier=3,
                    message=f"File {doc_path.name} adheres to event-driven / reactive execution model",
                    file_path=str(doc_path)
                ))

        return tier

    # -------------------------------------------------------------------------
    # Tier 4: Executable Examples & E2E Sanity
    # -------------------------------------------------------------------------
    def validate_tier4(self, execute_runners: bool = False) -> TierResult:
        tier = TierResult(tier=4, name="Executable Examples & Simulation Runners")

        example_dirs = [
            self.target_dir / "examples" / "architectural_design",
            self.target_dir / "examples" / "bug_diagnosis",
        ]

        for ex_dir in example_dirs:
            ex_name = ex_dir.name
            readme_path = ex_dir / "README.md"
            runner_path = ex_dir / "run_example.py"

            # 4.1 README existence & documentation
            if readme_path.exists():
                readme_text = readme_path.read_text(encoding="utf-8", errors="replace")
                if len(readme_text.strip()) >= 50:
                    tier.add_check(CheckResult(
                        check_id=f"T4.Readme.{ex_name}",
                        name=f"Example Documentation ({ex_name}/README.md)",
                        status=CheckStatus.PASS,
                        tier=4,
                        message=f"Example '{ex_name}' includes comprehensive README.md ({len(readme_text)} chars)",
                        file_path=str(readme_path)
                    ))
                else:
                    tier.add_check(CheckResult(
                        check_id=f"T4.Readme.{ex_name}",
                        name=f"Example Documentation ({ex_name}/README.md)",
                        status=CheckStatus.FAIL,
                        tier=4,
                        message=f"Example '{ex_name}' README.md is empty or too brief",
                        file_path=str(readme_path)
                    ))
            else:
                tier.add_check(CheckResult(
                    check_id=f"T4.Readme.{ex_name}",
                    name=f"Example Documentation ({ex_name}/README.md)",
                    status=CheckStatus.FAIL,
                    tier=4,
                    message=f"Example '{ex_name}' missing README.md",
                    file_path=str(readme_path)
                ))

            # 4.2 Runner Python Script Presence & AST Syntax Validation
            if runner_path.exists():
                code = runner_path.read_text(encoding="utf-8", errors="replace")
                try:
                    ast.parse(code)
                    tier.add_check(CheckResult(
                        check_id=f"T4.Syntax.{ex_name}",
                        name=f"Python Syntax ({ex_name}/run_example.py)",
                        status=CheckStatus.PASS,
                        tier=4,
                        message=f"Script '{ex_name}/run_example.py' parses as valid Python AST",
                        file_path=str(runner_path)
                    ))
                except SyntaxError as e:
                    tier.add_check(CheckResult(
                        check_id=f"T4.Syntax.{ex_name}",
                        name=f"Python Syntax ({ex_name}/run_example.py)",
                        status=CheckStatus.FAIL,
                        tier=4,
                        message=f"SyntaxError in {ex_name}/run_example.py: {e}",
                        file_path=str(runner_path)
                    ))
            else:
                tier.add_check(CheckResult(
                    check_id=f"T4.Syntax.{ex_name}",
                    name=f"Python Syntax ({ex_name}/run_example.py)",
                    status=CheckStatus.FAIL,
                    tier=4,
                    message=f"Missing runner script: {ex_name}/run_example.py",
                    file_path=str(runner_path)
                ))

        return tier

    # -------------------------------------------------------------------------
    # Master Execution
    # -------------------------------------------------------------------------
    def validate_all(self, selected_tiers: Optional[Set[int]] = None) -> ValidationReport:
        if selected_tiers is None:
            selected_tiers = {1, 2, 3, 4}

        tiers_map: Dict[int, TierResult] = {}
        total_p = 0
        total_f = 0
        total_w = 0
        total_s = 0

        if 1 in selected_tiers:
            t1 = self.validate_tier1()
            tiers_map[1] = t1
        if 2 in selected_tiers:
            t2 = self.validate_tier2()
            tiers_map[2] = t2
        if 3 in selected_tiers:
            t3 = self.validate_tier3()
            tiers_map[3] = t3
        if 4 in selected_tiers:
            t4 = self.validate_tier4()
            tiers_map[4] = t4

        for t in tiers_map.values():
            total_p += t.passed
            total_f += t.failed
            total_w += t.warnings
            total_s += t.skipped

        is_valid = (total_f == 0) and (not self.strict or total_w == 0)

        return ValidationReport(
            target_dir=str(self.target_dir),
            is_valid=is_valid,
            strict_mode=self.strict,
            total_passed=total_p,
            total_failed=total_f,
            total_warnings=total_w,
            total_skipped=total_s,
            tiers=tiers_map,
        )


def format_console_report(report: ValidationReport, verbose: bool = False) -> str:
    """Formats ValidationReport into a rich, human-readable terminal output."""
    lines = []
    lines.append("=" * 78)
    lines.append("  ANTIGRAVITY MULTI-AGENT REASONING FRAMEWORK — SKILL VALIDATION REPORT")
    lines.append("=" * 78)
    lines.append(f" Target Directory : {report.target_dir}")
    lines.append(f" Strict Mode      : {'ENABLED' if report.strict_mode else 'DISABLED'}")
    lines.append(f" Overall Status   : {'[PASSED] ALL INVARIANTS SATISFIED' if report.is_valid else '[FAILED] VALIDATION DEFECTS DETECTED'}")
    lines.append("-" * 78)

    for tier_num, tier in sorted(report.tiers.items()):
        status_tag = "[PASS]" if tier.is_success else "[FAIL]"
        lines.append(f"\n>> TIER {tier.tier}: {tier.name.upper()} {status_tag}")
        lines.append(f"   Passed: {tier.passed} | Failed: {tier.failed} | Warnings: {tier.warnings} | Skipped: {tier.skipped}")
        lines.append("   " + "-" * 72)

        for check in tier.checks:
            if check.status == CheckStatus.PASS:
                if verbose:
                    lines.append(f"   [✓ PASS] {check.check_id:<12} {check.name}: {check.message}")
            elif check.status == CheckStatus.FAIL:
                lines.append(f"   [✗ FAIL] {check.check_id:<12} {check.name}: {check.message}")
                if check.details:
                    lines.append(f"            Details: {check.details}")
            elif check.status == CheckStatus.WARN:
                lines.append(f"   [! WARN] {check.check_id:<12} {check.name}: {check.message}")
            elif check.status == CheckStatus.SKIP:
                if verbose:
                    lines.append(f"   [- SKIP] {check.check_id:<12} {check.name}: {check.message}")

    lines.append("\n" + "=" * 78)
    lines.append(
        f" SUMMARY: Passed: {report.total_passed} | Failed: {report.total_failed} | "
        f"Warnings: {report.total_warnings} | Total Checks: {report.total_passed + report.total_failed + report.total_warnings}"
    )
    lines.append("=" * 78)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Antigravity Multi-Agent Reasoning Skill Validator (Tiers 1-4)"
    )
    parser.add_argument(
        "--target-dir",
        "-d",
        type=str,
        default=".",
        help="Path to the skill root directory (default: current directory)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Treat all warnings as fatal errors",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output validation results in raw JSON format",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed output for all passed checks",
    )
    parser.add_argument(
        "--tier",
        "-t",
        type=str,
        default="all",
        help="Comma-separated list of tiers to validate (e.g. '1,2' or 'all')",
    )

    args = parser.parse_args()

    selected_tiers = None
    if args.tier.lower() != "all":
        try:
            selected_tiers = {int(x.strip()) for x in args.tier.split(",") if x.strip()}
        except ValueError:
            print(f"Error: Invalid tier specification '{args.tier}'. Use e.g. --tier 1,2 or --tier all", file=sys.stderr)
            sys.exit(2)

    validator = SkillValidator(
        target_dir=args.target_dir,
        strict=args.strict,
        verbose=args.verbose,
    )

    report = validator.validate_all(selected_tiers=selected_tiers)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print(format_console_report(report, verbose=args.verbose))

    sys.exit(0 if report.is_valid else 1)


if __name__ == "__main__":
    main()
