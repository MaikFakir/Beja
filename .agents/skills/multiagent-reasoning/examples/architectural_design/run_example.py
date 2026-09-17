#!/usr/bin/env python3
"""
Antigravity Multi-Agent Reasoning Framework — Example 1: Architectural Design
=============================================================================
Demonstrates the 'Debate & Adversarial Peer Review' workflow topology.

Scenario:
  High-Throughput Event Streaming Architecture (1,000,000 events/sec, sub-10ms p99, RPO=0).

Workflow Lifecycle:
  1. Problem Framing & Invariant Definition (Orchestrator)
  2. Parallel Blind Proposals (Proposer Alpha: Log-Centric vs Proposer Beta: Memory-First)
  3. Adversarial Peer Review & Score Matrix (Critic Subagent)
  4. Rebuttal & Defense Round (Proposers Alpha & Beta)
  5. Consensus Synthesis & Master Specification (Synthesizer Subagent)

Usage:
  python run_example.py [--simulate] [--verbose] [--json] [--export-artifacts]
"""

import argparse
from dataclasses import dataclass, field, asdict
from enum import Enum
import json
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional

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


class AnsiColor:
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    MAGENTA = "\033[95m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def colored(text: str, color: str) -> str:
    return f"{color}{text}{AnsiColor.RESET}"


@dataclass
class AgentMessage:
    sender: str
    recipient: str
    phase: str
    context: str
    content: str
    action: str
    payload_paths: List[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)

    def to_envelope_dict(self) -> Dict[str, Any]:
        return {
            "sender": self.sender,
            "recipient": self.recipient,
            "phase": self.phase,
            "**Context**": self.context,
            "**Content**": self.content,
            "**Action**": self.action,
            "**Payload**": self.payload_paths,
            "timestamp": self.timestamp,
        }


@dataclass
class ArchitectureProposal:
    proposer_id: str
    title: str
    philosophy: str
    ingest_latency_p99_ms: float
    durability_model: str
    rpo_guarantee: str
    rto_guarantee: str
    monthly_cost_usd: float
    key_vulnerability: str
    strengths: List[str]
    weaknesses: List[str]


@dataclass
class CritiqueScore:
    dimension: str
    weight: float
    alpha_score: float
    beta_score: float
    commentary: str


@dataclass
class DebateSimulationResult:
    problem_statement: str
    target_slos: Dict[str, Any]
    proposals: Dict[str, ArchitectureProposal]
    critique_matrix: List[CritiqueScore]
    alpha_total_score: float
    beta_total_score: float
    consensus_synthesis: Dict[str, Any]
    message_log: List[AgentMessage]
    execution_duration_sec: float
    status: str = "SUCCESS"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "problem_statement": self.problem_statement,
            "target_slos": self.target_slos,
            "proposals": {k: asdict(v) for k, v in self.proposals.items()},
            "critique_matrix": [asdict(c) for c in self.critique_matrix],
            "scores": {
                "proposal_alpha": self.alpha_total_score,
                "proposal_beta": self.beta_total_score,
            },
            "consensus_synthesis": self.consensus_synthesis,
            "message_log": [m.to_envelope_dict() for m in self.message_log],
            "execution_duration_sec": self.execution_duration_sec,
            "status": self.status,
        }


class ArchitecturalDebateOrchestrator:
    """Simulates the Debate & Adversarial Peer Review reasoning workflow."""

    def __init__(self, artifacts_dir: Optional[Path] = None, verbose: bool = False, simulated_delay: float = 0.05):
        self.artifacts_dir = artifacts_dir or (Path(__file__).parent / "artifacts")
        self.verbose = verbose
        self.simulated_delay = simulated_delay
        self.messages: List[AgentMessage] = []

    def log_step(self, step_title: str, agent: str, role: str):
        if not self.verbose:
            return
        print(f"\n{colored('▶ [' + agent + ' - ' + role + ']', AnsiColor.CYAN + AnsiColor.BOLD)} {colored(step_title, AnsiColor.BOLD)}")

    def emit_message(self, sender: str, recipient: str, phase: str, context: str, content: str, action: str, payloads: Optional[List[str]] = None) -> AgentMessage:
        msg = AgentMessage(
            sender=sender,
            recipient=recipient,
            phase=phase,
            context=context,
            content=content,
            action=action,
            payload_paths=payloads or [],
        )
        self.messages.append(msg)
        if self.verbose:
            print(f"  {colored('→ Message Passed:', AnsiColor.DIM)} {sender} ➔ {recipient} [{phase}]")
            print(f"    {colored('Context:', AnsiColor.YELLOW)} {context}")
            print(f"    {colored('Content:', AnsiColor.GREEN)} {content[:90]}...")
            print(f"    {colored('Action :', AnsiColor.MAGENTA)} {action}")
        time.sleep(self.simulated_delay)
        return msg

    def run(self) -> DebateSimulationResult:
        start_time = time.time()

        # =====================================================================
        # Phase 0: Problem Framing (Orchestrator)
        # =====================================================================
        self.log_step("Phase 0: Problem Framing & Constraint Definition", "orchestrator", "Master Coordinator")
        problem = "Design an ultra-reliable, high-throughput event streaming platform for 1M events/sec."
        slos = {
            "throughput_ev_per_sec": 1_000_000,
            "latency_p99_ms": 10.0,
            "data_loss_rpo": 0,
            "recovery_time_rto_sec": 30,
            "processing_guarantee": "End-to-End Exactly-Once",
            "budget_max_usd_month": 25_000,
        }

        self.emit_message(
            sender="orchestrator",
            recipient="proposer_alpha, proposer_beta",
            phase="PHASE_0_FRAMING",
            context="System Architecture RFP for 1M ev/s Event Ingestion",
            content="Generate competitive architectural proposals satisfying strict RPO=0 and sub-10ms p99 latency.",
            action="Produce independent, blind technical proposals in artifacts/.",
        )

        # =====================================================================
        # Phase 1: Parallel Blind Proposals (Alpha & Beta)
        # =====================================================================
        self.log_step("Phase 1: Generating Proposal Alpha (Log-Centric)", "proposer_alpha", "Specialist Proposer")
        alpha = ArchitectureProposal(
            proposer_id="proposer_alpha",
            title="Log-Centric Distributed Streaming Architecture (Redpanda + Flink)",
            philosophy="Storage-first immutable append log with Raft consensus and RocksDB incremental state.",
            ingest_latency_p99_ms=2.4,
            durability_model="Raft Quorum Replication (RF=3, min.insync=2)",
            rpo_guarantee="Strict RPO = 0",
            rto_guarantee="RTO < 15s (Automated Raft leader election)",
            monthly_cost_usd=19_382.0,
            key_vulnerability="Flink checkpoint barrier alignment stalls under downstream backpressure.",
            strengths=[
                "Guaranteed RPO=0 via Raft quorum writes before ACK",
                "Proven Kafka-compatible ecosystem and client libraries",
                "Partitioned fault isolation preventing cross-tenant blast radius",
            ],
            weaknesses=[
                "Higher baseline NVMe I/O cost",
                "Risk of RocksDB compaction storms during write bursts",
            ],
        )

        self.emit_message(
            sender="proposer_alpha",
            recipient="critic",
            phase="PHASE_1_PROPOSAL",
            context="Proposal Alpha Submission",
            content="Proposal Alpha: Redpanda NVMe log broker + Flink stateful compute with end-to-end exactly-once.",
            action="Perform blind adversarial red-team review.",
            payloads=["examples/architectural_design/artifacts/proposal_alpha.md"],
        )

        self.log_step("Phase 1: Generating Proposal Beta (Memory-First)", "proposer_beta", "Specialist Proposer")
        beta = ArchitectureProposal(
            proposer_id="proposer_beta",
            title="Memory-First Distributed Ring Buffer Architecture (Aeron IPC + Ray Actors)",
            philosophy="Kernel-bypass shared-memory ring buffers with lock-free atomic aggregations.",
            ingest_latency_p99_ms=0.18,
            durability_model="Asynchronous Memory-Mapped NVMe WAL Flush (100ms interval)",
            rpo_guarantee="RPO <= 100ms (Power failure loss window)",
            rto_guarantee="RTO < 5s (DNS active-active failover)",
            monthly_cost_usd=13_308.0,
            key_vulnerability="Unpersisted DRAM event loss during catastrophic AZ power outages violating RPO=0.",
            strengths=[
                "Extreme sub-millisecond p99 latency (180 microseconds)",
                "Low infrastructure footprint and cost ($13.3k/mo)",
                "Lock-free single-producer single-consumer thread isolation",
            ],
            weaknesses=[
                "Async WAL flush violates financial RPO=0 compliance",
                "Head-of-line blocking if ring buffer consumers stall",
                "Operational complexity of RDMA / RoCEv2 in cloud VPCs",
            ],
        )

        self.emit_message(
            sender="proposer_beta",
            recipient="critic",
            phase="PHASE_1_PROPOSAL",
            context="Proposal Beta Submission",
            content="Proposal Beta: Aeron IPC zero-copy ring buffers + In-memory Ray actors with sub-1ms transit.",
            action="Perform blind adversarial red-team review.",
            payloads=["examples/architectural_design/artifacts/proposal_beta.md"],
        )

        # =====================================================================
        # Phase 2: Adversarial Peer Review & Score Matrix (Critic)
        # =====================================================================
        self.log_step("Phase 2: Adversarial Peer Review & Red-Teaming", "critic", "Adversarial Reviewer")

        critique_matrix = [
            CritiqueScore(
                dimension="Durability & RPO=0 Compliance",
                weight=0.30,
                alpha_score=9.5,
                beta_score=4.0,
                commentary="Alpha enforces strict Raft quorum persistence. Beta's 100ms async WAL risks losing up to 100k events on node crash.",
            ),
            CritiqueScore(
                dimension="Latency & Jitter (p99 < 10ms)",
                weight=0.25,
                alpha_score=8.0,
                beta_score=9.8,
                commentary="Beta achieves microsecond transit via shared-memory rings. Alpha delivers steady 2.4ms but risks checkpoint lag.",
            ),
            CritiqueScore(
                dimension="Operational Simplicity & Ecosystem",
                weight=0.15,
                alpha_score=8.5,
                beta_score=5.0,
                commentary="Alpha uses standard Kafka/Flink tooling. Beta requires custom kernel-bypass tuning and RDMA network configs.",
            ),
            CritiqueScore(
                dimension="Fault Isolation & Blast Radius",
                weight=0.15,
                alpha_score=9.0,
                beta_score=6.5,
                commentary="Alpha's partition isolation prevents cascade failures. Beta's bounded ring buffer risks head-of-line blocking.",
            ),
            CritiqueScore(
                dimension="Cost Efficiency & Storage",
                weight=0.15,
                alpha_score=7.5,
                beta_score=9.0,
                commentary="Beta saves $6k/mo in hardware costs, but savings do not justify non-compliance with RPO=0.",
            ),
        ]

        alpha_total = sum(c.weight * c.alpha_score for c in critique_matrix)
        beta_total = sum(c.weight * c.beta_score for c in critique_matrix)

        self.emit_message(
            sender="critic",
            recipient="orchestrator, proposer_alpha, proposer_beta",
            phase="PHASE_2_CRITIQUE",
            context="Adversarial Red Team Audit & Quantitative Score Matrix",
            content=f"Evaluation complete. Proposal Alpha Score: {alpha_total:.2f}/10. Proposal Beta Score: {beta_total:.2f}/10. Critical vulnerability flagged in Beta (RPO>0).",
            action="Review findings and prepare rebuttal / mitigation answers.",
            payloads=["examples/architectural_design/artifacts/critic_review.md"],
        )

        # =====================================================================
        # Phase 3: Rebuttal & Defense Round (Alpha & Beta)
        # =====================================================================
        self.log_step("Phase 3: Rebuttal & Defense Round", "proposer_alpha", "Specialist Proposer")
        self.emit_message(
            sender="proposer_alpha",
            recipient="synthesizer",
            phase="PHASE_3_REBUTTAL",
            context="Alpha Rebuttal & Mitigation",
            content="Mitigating checkpoint alignment stalls by adopting Flink Unaligned Checkpoints and RocksDB partitioned index caching.",
            action="Incorporate unaligned checkpointing into synthesis.",
        )

        self.log_step("Phase 3: Rebuttal & Defense Round", "proposer_beta", "Specialist Proposer")
        self.emit_message(
            sender="proposer_beta",
            recipient="synthesizer",
            phase="PHASE_3_REBUTTAL",
            context="Beta Rebuttal & Ingress Decoupling",
            content="Conceding broker-less durability limitation; recommending using zero-copy ring buffers strictly as the stateless ingress gateway.",
            action="Adopt ring buffer front-end decoupled from durable log back-end.",
        )

        # =====================================================================
        # Phase 4: Consensus Synthesis & Arbiter Specification (Synthesizer)
        # =====================================================================
        self.log_step("Phase 4: Consensus Synthesis & Master Specification", "synthesizer", "Master Arbiter")

        synthesis = {
            "architecture_name": "Hybrid Tiered Event Streaming Platform",
            "ingress_tier": "Zero-copy shared-memory ring buffers (from Beta) mapped to kernel-bypass gateways",
            "durable_log_tier": "Redpanda NVMe Raft cluster with RF=3 (from Alpha) enforcing RPO=0",
            "stream_compute_tier": "Apache Flink with Unaligned Checkpoints and RocksDB state backend (Hybrid)",
            "storage_tier": "Hot NVMe local log (<2h) + Cold S3 Express One-Zone Tiered Storage",
            "guaranteed_latency_p99_ms": 6.45,
            "guaranteed_rpo": "Strict RPO = 0",
            "guaranteed_rto_sec": 12.0,
            "monthly_cost_usd": 18_658.0,
            "verdict": "Consensus reached. Hybrid architecture approved for production deployment.",
        }

        self.emit_message(
            sender="synthesizer",
            recipient="orchestrator",
            phase="PHASE_4_SYNTHESIS",
            context="Final Architecture Specification Approved",
            content="Hybrid Tiered Event Streaming Architecture synthesized and verified against all SLOs.",
            action="Publish master architecture specification to team.",
            payloads=["examples/architectural_design/artifacts/synthesis_spec.md"],
        )

        duration = time.time() - start_time

        return DebateSimulationResult(
            problem_statement=problem,
            target_slos=slos,
            proposals={"proposal_alpha": alpha, "proposal_beta": beta},
            critique_matrix=critique_matrix,
            alpha_total_score=round(alpha_total, 2),
            beta_total_score=round(beta_total, 2),
            consensus_synthesis=synthesis,
            message_log=self.messages,
            execution_duration_sec=round(duration, 4),
        )


def format_text_report(res: DebateSimulationResult) -> str:
    lines = []
    lines.append("=" * 80)
    lines.append("  ANTIGRAVITY MULTI-AGENT REASONING — DEBATE & ADVERSARIAL REVIEW SIMULATION")
    lines.append("=" * 80)
    lines.append(f" Problem Statement : {res.problem_statement}")
    lines.append(f" Target Throughput : {res.target_slos['throughput_ev_per_sec']:,} events/sec")
    lines.append(f" Target Latency    : Sub-{res.target_slos['latency_p99_ms']}ms p99")
    lines.append(f" Target Durability : RPO = {res.target_slos['data_loss_rpo']} (Strict Exactly-Once)")
    lines.append("-" * 80)

    lines.append("\n>> PROPOSALS SUBMITTED:")
    for key, p in res.proposals.items():
        lines.append(f"  • [{p.proposer_id.upper()}] {p.title}")
        lines.append(f"    - Philosophy    : {p.philosophy}")
        lines.append(f"    - p99 Latency   : {p.ingest_latency_p99_ms} ms")
        lines.append(f"    - Durability    : {p.durability_model} ({p.rpo_guarantee})")
        lines.append(f"    - Monthly Cost  : ${p.monthly_cost_usd:,.2f}")

    lines.append("\n>> ADVERSARIAL CRITIC EVALUATION & TRADEOFF MATRIX:")
    lines.append(f"  {'Dimension':<35} {'Weight':<8} {'Alpha':<8} {'Beta':<8} {'Commentary'}")
    lines.append("  " + "-" * 76)
    for c in res.critique_matrix:
        lines.append(f"  {c.dimension:<35} {int(c.weight*100)}%     {c.alpha_score:<8.1f} {c.beta_score:<8.1f} {c.commentary[:38]}...")
    lines.append("  " + "-" * 76)
    lines.append(f"  {'WEIGHTED TOTAL SCORE':<35} 100%    {res.alpha_total_score:<8.2f} {res.beta_total_score:<8.2f} Alpha wins durability; Beta wins latency.")

    lines.append("\n>> FINAL ARBITER SYNTHESIS (HYBRID ARCHITECTURE):")
    syn = res.consensus_synthesis
    lines.append(f"  • Platform Name    : {syn['architecture_name']}")
    lines.append(f"  • Ingress Gateway  : {syn['ingress_tier']}")
    lines.append(f"  • Durable Log Tier : {syn['durable_log_tier']}")
    lines.append(f"  • Compute Engine   : {syn['stream_compute_tier']}")
    lines.append(f"  • Verified SLOs    : p99 Latency = {syn['guaranteed_latency_p99_ms']}ms | {syn['guaranteed_rpo']} | RTO = {syn['guaranteed_rto_sec']}s")
    lines.append(f"  • Optimized Budget : ${syn['monthly_cost_usd']:,.2f} / month")
    lines.append(f"  • Final Status     : {syn['verdict']}")

    lines.append("\n" + "=" * 80)
    lines.append(f" SIMULATION COMPLETED IN {res.execution_duration_sec:.3f}s | TOTAL MESSAGES EXCHANGED: {len(res.message_log)} | STATUS: {res.status}")
    lines.append("=" * 80)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Run the Architectural Design Multi-Agent Debate Simulation."
    )
    parser.add_argument(
        "--simulate",
        action="store_true",
        default=True,
        help="Run end-to-end multi-agent orchestration simulation (default: True)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Print detailed agent-to-agent message passing envelopes",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output result as JSON",
    )
    parser.add_argument(
        "--export-artifacts",
        action="store_true",
        help="Verify or refresh markdown artifacts in artifacts/ directory",
    )

    args = parser.parse_args()

    orchestrator = ArchitecturalDebateOrchestrator(verbose=args.verbose)
    result = orchestrator.run()

    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print(format_text_report(result))

    if args.export_artifacts:
        print("\n>> VERIFYING / EXPORTING ARTIFACTS:")
        artifacts_dir = orchestrator.artifacts_dir
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        expected_artifacts = [
            ("proposal_alpha.md", "Proposal Alpha: Redpanda + Flink Architecture"),
            ("proposal_beta.md", "Proposal Beta: Aeron IPC + Ray Architecture"),
            ("critic_review.md", "Adversarial Peer Review & Score Matrix"),
            ("synthesis_spec.md", "Consensus Synthesis Master Specification"),
        ]
        for fname, description in expected_artifacts:
            fpath = artifacts_dir / fname
            if fpath.exists():
                size = fpath.stat().st_size
                print(f"  * {fname:<20} : VERIFIED ({size} bytes) — {description}")
            else:
                print(f"  * {fname:<20} : MISSING -> {fpath}")

    sys.exit(0)


if __name__ == "__main__":
    main()
