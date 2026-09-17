"""
Antigravity Multi-Agent Reasoning Framework - Comprehensive Test Suite
======================================================================
Exercises all 4 Verification Tiers:
  - Tier 1: Syntax, Frontmatter & File Layout
  - Tier 2: Boundary Validation, Subagent Registry & Capability Schemas
  - Tier 3: Workflow State Machines & Messaging Protocols
  - Tier 4: Executable Examples, Simulation Runner Syntax & Sanity
"""

import ast
import json
from pathlib import Path
import subprocess
import sys
from typing import Dict, Any

import pytest

from validate_skill import (
    SkillValidator,
    CheckStatus,
    parse_yaml_frontmatter,
    format_console_report,
)


# =============================================================================
# TIER 1 TESTS: Syntax, Frontmatter & File Layout
# =============================================================================
class TestTier1SyntaxLayout:
    """Tier 1: Frontmatter parsing, mandatory files, directory structure, relative links."""

    def test_mock_valid_skill_tier1_passes(self, mock_valid_skill: Path):
        """Golden baseline mock skill must achieve 100% pass rate in Tier 1."""
        validator = SkillValidator(target_dir=mock_valid_skill, strict=True)
        tier1_res = validator.validate_tier1()

        assert tier1_res.is_success, f"Expected Tier 1 to succeed, got failures: {[c.message for c in tier1_res.checks if c.status == CheckStatus.FAIL]}"
        assert tier1_res.passed >= 15
        assert tier1_res.failed == 0

    @pytest.mark.parametrize(
        "frontmatter_content,expected_name,should_pass",
        [
            ("---\nname: multiagent-reasoning\ndescription: Use when multi-agent reasoning is needed.\n---", "multiagent-reasoning", True),
            ("---\nname: invalid-name\ndescription: Use when multi-agent reasoning is needed.\n---", "invalid-name", False),
            ("---\nname: multiagent-reasoning\n---", "multiagent-reasoning", False),  # Missing description
        ],
    )
    def test_frontmatter_name_and_description_variations(
        self, tmp_path: Path, frontmatter_content: str, expected_name: str, should_pass: bool
    ):
        """Verifies frontmatter name and description field parsing under various configurations."""
        skill_dir = tmp_path / "skill_test"
        skill_dir.mkdir(parents=True, exist_ok=True)
        (skill_dir / "SKILL.md").write_text(frontmatter_content + "\n# Skill Title\n", encoding="utf-8")

        parsed, _, err = parse_yaml_frontmatter(frontmatter_content + "\n# Skill Title\n")
        assert err is None
        assert parsed is not None
        assert parsed.get("name") == expected_name

        validator = SkillValidator(target_dir=skill_dir)
        tier1 = validator.validate_tier1()
        has_fail = any(c.status == CheckStatus.FAIL for c in tier1.checks)
        if should_pass:
            # File presence checks might fail because subdirs aren't created, but frontmatter checks must pass
            name_check = next((c for c in tier1.checks if c.check_id == "T1.3"), None)
            assert name_check is not None
            assert name_check.status == CheckStatus.PASS
        else:
            if expected_name != "multiagent-reasoning":
                name_check = next((c for c in tier1.checks if c.check_id == "T1.3"), None)
                assert name_check is not None
                assert name_check.status == CheckStatus.FAIL

    def test_missing_skill_md_fails(self, tmp_path: Path):
        """Validator must report failure if SKILL.md is missing from root."""
        empty_dir = tmp_path / "empty_skill"
        empty_dir.mkdir()

        validator = SkillValidator(target_dir=empty_dir)
        tier1 = validator.validate_tier1()

        assert not tier1.is_success
        assert any(c.check_id == "T1.1" and c.status == CheckStatus.FAIL for c in tier1.checks)

    def test_unclosed_frontmatter_fails(self, tmp_path: Path):
        """Frontmatter missing closing delimiter '---' must fail."""
        skill_dir = tmp_path / "unclosed"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\nname: multiagent-reasoning\ndescription: missing end\n# Body", encoding="utf-8")

        validator = SkillValidator(target_dir=skill_dir)
        tier1 = validator.validate_tier1()

        assert not tier1.is_success
        assert any(c.check_id == "T1.2" and c.status == CheckStatus.FAIL for c in tier1.checks)

    @pytest.mark.parametrize(
        "missing_file",
        [
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
        ],
    )
    def test_missing_individual_core_files_detected(self, mock_valid_skill: Path, missing_file: str):
        """Each core file in the feature inventory must trigger an explicit failure if absent."""
        target_path = mock_valid_skill / missing_file
        assert target_path.exists(), f"Prerequisite failed: {target_path} should exist in mock"

        # Temporarily rename file
        backup_path = target_path.with_suffix(".bak")
        target_path.rename(backup_path)
        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier1 = validator.validate_tier1()
            
            check_id = f"T1.File.{missing_file.replace('/', '.')}"
            failed_check = next((c for c in tier1.checks if c.check_id == check_id), None)
            assert failed_check is not None, f"Expected check {check_id} to be executed"
            assert failed_check.status == CheckStatus.FAIL
        finally:
            backup_path.rename(target_path)

    def test_relative_link_resolution_and_dead_link_detection(self, mock_valid_skill: Path):
        """Valid relative links must pass; non-existent target files must fail."""
        skill_md = mock_valid_skill / "SKILL.md"
        original_content = skill_md.read_text(encoding="utf-8")

        # Inject a broken link
        skill_md.write_text(original_content + "\n[Broken Doc](docs/non_existent_file.md)\n", encoding="utf-8")
        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier1 = validator.validate_tier1()
            dead_link_check = next((c for c in tier1.checks if "non_existent_file.md" in c.check_id), None)
            assert dead_link_check is not None
            assert dead_link_check.status == CheckStatus.FAIL
        finally:
            skill_md.write_text(original_content, encoding="utf-8")

    def test_windows_backslash_anti_pattern_in_markdown_links(self, mock_valid_skill: Path):
        """Markdown links using Windows '\\' backslashes must fail link portability check."""
        skill_md = mock_valid_skill / "SKILL.md"
        original_content = skill_md.read_text(encoding="utf-8")

        # Inject Windows backslash link
        skill_md.write_text(original_content + "\n[Backslash Link](prompts\\planner.md)\n", encoding="utf-8")
        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier1 = validator.validate_tier1()
            backslash_check = next((c for c in tier1.checks if "T1.LinkStyle" in c.check_id), None)
            assert backslash_check is not None
            assert backslash_check.status == CheckStatus.FAIL
        finally:
            skill_md.write_text(original_content, encoding="utf-8")


# =============================================================================
# TIER 2 TESTS: Boundary & Tool Permission Schemas
# =============================================================================
class TestTier2BoundaryAndPermissions:
    """Tier 2: Subagents JSON schema, tool capability flags, workspace scoping invariants."""

    def test_mock_valid_skill_tier2_passes(self, mock_valid_skill: Path):
        """Golden baseline mock skill must satisfy all Tier 2 permission and schema invariants."""
        validator = SkillValidator(target_dir=mock_valid_skill, strict=True)
        tier2_res = validator.validate_tier2()

        assert tier2_res.is_success, f"Tier 2 failed: {[c.message for c in tier2_res.checks if c.status == CheckStatus.FAIL]}"
        assert tier2_res.passed >= 15
        assert tier2_res.failed == 0

    @pytest.mark.parametrize(
        "invalid_name",
        [
            "MultiAgentReasoning",  # Uppercase
            "multi agent reasoning",  # Spaces
            "multi_agent_reasoning",  # Underscores (must be kebab-case)
            "-multiagent-reasoning",  # Leading hyphen
            "multiagent-reasoning-",  # Trailing hyphen
            "multiagent$reasoning",  # Special character
        ],
    )
    def test_skill_name_kebab_case_boundary_violations(self, mock_valid_skill: Path, invalid_name: str):
        """Non-kebab-case skill names must be rejected by Tier 2 boundary checks."""
        skill_md = mock_valid_skill / "SKILL.md"
        original_content = skill_md.read_text(encoding="utf-8")
        modified_content = original_content.replace("name: multiagent-reasoning", f"name: {invalid_name}")
        skill_md.write_text(modified_content, encoding="utf-8")

        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier2 = validator.validate_tier2()
            kebab_check = next((c for c in tier2.checks if c.check_id == "T2.1"), None)
            assert kebab_check is not None
            assert kebab_check.status == CheckStatus.FAIL
        finally:
            skill_md.write_text(original_content, encoding="utf-8")

    @pytest.mark.parametrize(
        "archetype,illegal_flag,illegal_value",
        [
            ("planner", "enable_write_tools", True),  # Planner must not have write tools
            ("planner", "enable_mcp_tools", True),  # Planner must not have MCP tools
            ("researcher", "enable_write_tools", True),  # Researcher must be strictly read-only
            ("researcher", "enable_subagent_tools", True),  # Researcher cannot spawn subagents
            ("critic", "enable_write_tools", True),  # Critic cannot mutate source code
            ("critic", "enable_subagent_tools", True),  # Critic cannot spawn subagents
            ("synthesizer", "enable_write_tools", False),  # Synthesizer requires write tools
            ("synthesizer", "enable_subagent_tools", True),  # Synthesizer cannot spawn subagents
        ],
    )
    def test_tool_permission_escalation_detection(
        self, mock_valid_skill: Path, archetype: str, illegal_flag: str, illegal_value: bool
    ):
        """Security invariant: illegal capability permutations must be flagged as critical failures."""
        subagents_file = mock_valid_skill / "resources" / "subagents.json"
        data = json.loads(subagents_file.read_text(encoding="utf-8"))
        original_val = data["subagent_definitions"][archetype]["capabilities"][illegal_flag]

        # Mutate to illegal state
        data["subagent_definitions"][archetype]["capabilities"][illegal_flag] = illegal_value
        subagents_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier2 = validator.validate_tier2()

            check_id = f"T2.Cap.{archetype}.{illegal_flag}"
            cap_check = next((c for c in tier2.checks if c.check_id == check_id), None)
            assert cap_check is not None
            assert cap_check.status == CheckStatus.FAIL
            assert "Security violation" in cap_check.message
        finally:
            data["subagent_definitions"][archetype]["capabilities"][illegal_flag] = original_val
            subagents_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    @pytest.mark.parametrize(
        "archetype,illegal_write_scope",
        [
            ("planner", "workspace_root"),  # Planner cannot have project write scope
            ("researcher", "workspace_root"),  # Researcher cannot have project write scope
            ("critic", "workspace_root"),  # Critic cannot have project write scope
            ("synthesizer", ".agents/synthesizer"),  # Synthesizer needs project root access
        ],
    )
    def test_workspace_policy_scoping_violations(
        self, mock_valid_skill: Path, archetype: str, illegal_write_scope: str
    ):
        """Workspace policy boundaries must restrict non-synthesizers to .agents/<id>/."""
        subagents_file = mock_valid_skill / "resources" / "subagents.json"
        data = json.loads(subagents_file.read_text(encoding="utf-8"))
        original_scope = data["subagent_definitions"][archetype]["workspace_policy"]["write_scope"]

        data["subagent_definitions"][archetype]["workspace_policy"]["write_scope"] = illegal_write_scope
        subagents_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier2 = validator.validate_tier2()
            scope_check = next((c for c in tier2.checks if c.check_id == f"T2.Scope.{archetype}"), None)
            assert scope_check is not None
            assert scope_check.status == CheckStatus.FAIL
        finally:
            data["subagent_definitions"][archetype]["workspace_policy"]["write_scope"] = original_scope
            subagents_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def test_invalid_json_syntax_in_subagents_registry(self, mock_valid_skill: Path):
        """Malformed JSON syntax in resources/subagents.json must be caught gracefully."""
        subagents_file = mock_valid_skill / "resources" / "subagents.json"
        original_content = subagents_file.read_text(encoding="utf-8")

        subagents_file.write_text("{ unquoted_key: 123, broken, json }", encoding="utf-8")
        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier2 = validator.validate_tier2()
            assert not tier2.is_success
            syntax_check = next((c for c in tier2.checks if c.check_id == "T2.2"), None)
            assert syntax_check is not None
            assert syntax_check.status == CheckStatus.FAIL
        finally:
            subagents_file.write_text(original_content, encoding="utf-8")


# =============================================================================
# TIER 3 TESTS: Workflow Protocols, State Machines & Anti-Patterns
# =============================================================================
class TestTier3ProtocolsAndStateMachines:
    """Tier 3: Structured messaging envelopes, Mermaid diagrams, stopping criteria, anti-patterns."""

    def test_mock_valid_skill_tier3_passes(self, mock_valid_skill: Path):
        """Golden baseline mock skill must satisfy all Tier 3 protocol invariants."""
        validator = SkillValidator(target_dir=mock_valid_skill, strict=True)
        tier3_res = validator.validate_tier3()

        assert tier3_res.is_success, f"Tier 3 failed: {[c.message for c in tier3_res.checks if c.status == CheckStatus.FAIL]}"
        assert tier3_res.passed >= 8
        assert tier3_res.failed == 0

    @pytest.mark.parametrize("missing_envelope_field", ["Context", "Content", "Action"])
    def test_missing_message_envelope_fields_detected(self, mock_valid_skill: Path, missing_envelope_field: str):
        """Standard message envelope fields (**Context**, **Content**, **Action**) must be specified."""
        proto_file = mock_valid_skill / "references" / "message_protocols.md"
        original_text = proto_file.read_text(encoding="utf-8")

        # Strip target field
        mutated_text = original_text.replace(f"**{missing_envelope_field}**", f"[OMITTED_{missing_envelope_field}]")
        proto_file.write_text(mutated_text, encoding="utf-8")

        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier3 = validator.validate_tier3()
            field_check = next((c for c in tier3.checks if c.check_id == f"T3.MsgField.{missing_envelope_field}"), None)
            assert field_check is not None
            assert field_check.status == CheckStatus.FAIL
        finally:
            proto_file.write_text(original_text, encoding="utf-8")

    def test_iterative_loop_missing_stopping_criteria_fails(self, mock_valid_skill: Path):
        """Iterative refinement loop without explicit stopping criteria / bounds must fail."""
        loop_file = mock_valid_skill / "workflows" / "iterative_loop.md"
        original_text = loop_file.read_text(encoding="utf-8")

        # Strip stopping criteria section
        mutated_text = original_text.replace("Maximum iterations", "Run indefinitely")
        mutated_text = mutated_text.replace("Stopping Criteria", "General Notes")
        mutated_text = mutated_text.replace("budget exhaustion", "endless cycle")
        loop_file.write_text(mutated_text, encoding="utf-8")

        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier3 = validator.validate_tier3()
            stop_check = next((c for c in tier3.checks if c.check_id == "T3.StoppingCriteria.iterative_loop"), None)
            assert stop_check is not None
            assert stop_check.status == CheckStatus.FAIL
        finally:
            loop_file.write_text(original_text, encoding="utf-8")

    def test_anti_pattern_tight_polling_loop_detection(self, mock_valid_skill: Path):
        """Anti-pattern: files recommending active polling loops must be flagged."""
        wf_file = mock_valid_skill / "workflows" / "hierarchical.md"
        original_text = wf_file.read_text(encoding="utf-8")

        # Introduce polling anti-pattern
        bad_instruction = "\nMaster will execute tight polling: while True: sleep(5) until worker finishes.\n"
        wf_file.write_text(original_text + bad_instruction, encoding="utf-8")

        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier3 = validator.validate_tier3()
            anti_check = next((c for c in tier3.checks if "T3.AntiPattern" in c.check_id), None)
            assert anti_check is not None
            assert anti_check.status == CheckStatus.FAIL
        finally:
            wf_file.write_text(original_text, encoding="utf-8")


# =============================================================================
# TIER 4 TESTS: Executable Examples & Simulation Runners
# =============================================================================
class TestTier4ExampleExecution:
    """Tier 4: Example documentation, runner AST parsing, simulation sanity."""

    def test_mock_valid_skill_tier4_passes(self, mock_valid_skill: Path):
        """Golden baseline mock skill must satisfy all Tier 4 example requirements."""
        validator = SkillValidator(target_dir=mock_valid_skill, strict=True)
        tier4_res = validator.validate_tier4()

        assert tier4_res.is_success, f"Tier 4 failed: {[c.message for c in tier4_res.checks if c.status == CheckStatus.FAIL]}"
        assert tier4_res.passed >= 4
        assert tier4_res.failed == 0

    @pytest.mark.parametrize("scenario", ["architectural_design", "bug_diagnosis"])
    def test_example_runner_ast_syntax_validity(self, mock_valid_skill: Path, scenario: str):
        """Simulation runner scripts must be syntactically valid Python code."""
        runner_file = mock_valid_skill / "examples" / scenario / "run_example.py"
        assert runner_file.exists()
        code = runner_file.read_text(encoding="utf-8")
        parsed_ast = ast.parse(code)
        assert isinstance(parsed_ast, ast.Module)

    @pytest.mark.parametrize("scenario", ["architectural_design", "bug_diagnosis"])
    def test_example_runner_syntax_error_detected(self, mock_valid_skill: Path, scenario: str):
        """Broken Python syntax in example runners must trigger Tier 4 validation failures."""
        runner_file = mock_valid_skill / "examples" / scenario / "run_example.py"
        original_code = runner_file.read_text(encoding="utf-8")

        runner_file.write_text("def broken_func(:\n  print 'syntax error'\n", encoding="utf-8")
        try:
            validator = SkillValidator(target_dir=mock_valid_skill)
            tier4 = validator.validate_tier4()
            syntax_check = next((c for c in tier4.checks if c.check_id == f"T4.Syntax.{scenario}"), None)
            assert syntax_check is not None
            assert syntax_check.status == CheckStatus.FAIL
        finally:
            runner_file.write_text(original_code, encoding="utf-8")


# =============================================================================
# CLI & INTEGRATION TESTS: validate_skill.py
# =============================================================================
class TestValidatorCLIAndReporting:
    """CLI parameter parsing, JSON output schema, and terminal formatting."""

    def test_validator_master_execution_all_tiers(self, mock_valid_skill: Path):
        """validate_all() runs all 4 tiers and produces unified report."""
        validator = SkillValidator(target_dir=mock_valid_skill, strict=True)
        report = validator.validate_all()

        assert report.is_valid
        assert report.total_failed == 0
        assert report.total_passed >= 40
        assert len(report.tiers) == 4

        # Test JSON serialization
        report_dict = report.to_dict()
        assert report_dict["is_valid"] is True
        assert "summary" in report_dict
        assert report_dict["summary"]["total_passed"] == report.total_passed

    def test_console_formatting_output(self, mock_valid_skill: Path):
        """Console output formatting renders header, tiers, and summary cleanly."""
        validator = SkillValidator(target_dir=mock_valid_skill, strict=True)
        report = validator.validate_all()
        console_out = format_console_report(report, verbose=True)

        assert "ANTIGRAVITY MULTI-AGENT REASONING FRAMEWORK" in console_out
        assert "TIER 1:" in console_out
        assert "TIER 2:" in console_out
        assert "TIER 3:" in console_out
        assert "TIER 4:" in console_out
        assert "ALL INVARIANTS SATISFIED" in console_out

    def test_selective_tier_execution(self, mock_valid_skill: Path):
        """Selective tier filtering runs only requested tiers."""
        validator = SkillValidator(target_dir=mock_valid_skill)
        report = validator.validate_all(selected_tiers={1, 3})

        assert set(report.tiers.keys()) == {1, 3}
        assert 2 not in report.tiers
        assert 4 not in report.tiers
