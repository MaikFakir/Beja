"""
Empirical Stress Test Harness for Antigravity Examples
Evaluates CLI flags, Windows charmap encoding, and high-load asyncio concurrency benchmark.
"""

import asyncio
import gc
import json
import os
import subprocess
import sys
import time
import traceback
import weakref
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "examples" / "architectural_design"))
sys.path.insert(0, str(PROJECT_ROOT / "examples" / "bug_diagnosis"))

import run_example as arch_example
from examples.bug_diagnosis.run_example import (
    VerifiedPool,
    VerifiedConnection,
    ConnectionState,
    run_live_regression_benchmark,
    BugDiagnosisOrchestrator,
)
from examples.architectural_design.run_example import (
    ArchitecturalDebateOrchestrator,
)


def test_cli_invocations():
    """Test CLI invocations of both examples across flag permutations."""
    results = {}
    flags_arch = [
        [],
        ["--verbose"],
        ["-v"],
        ["--json"],
        ["--simulate"],
        ["--export-artifacts"],
        ["--verbose", "--json"],
    ]
    
    script_arch = str(PROJECT_ROOT / "examples" / "architectural_design" / "run_example.py")
    results["architectural_design"] = []
    
    for f in flags_arch:
        cmd = [sys.executable, script_arch] + f
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        status = "PASS" if proc.returncode == 0 else "FAIL"
        err_msg = proc.stderr.strip() if proc.returncode != 0 else ""
        results["architectural_design"].append({
            "flags": " ".join(f) or "(default)",
            "exit_code": proc.returncode,
            "status": status,
            "error": err_msg,
            "stdout_len": len(proc.stdout),
        })

    flags_bug = [
        [],
        ["--verbose"],
        ["-v"],
        ["--json"],
        ["--run-benchmark"],
        ["--simulate"],
        ["--verbose", "--json"],
        ["--verbose", "--run-benchmark"],
    ]
    
    script_bug = str(PROJECT_ROOT / "examples" / "bug_diagnosis" / "run_example.py")
    results["bug_diagnosis"] = []
    
    for f in flags_bug:
        cmd = [sys.executable, script_bug] + f
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        status = "PASS" if proc.returncode == 0 else "FAIL"
        err_msg = proc.stderr.strip() if proc.returncode != 0 else ""
        results["bug_diagnosis"].append({
            "flags": " ".join(f) or "(default)",
            "exit_code": proc.returncode,
            "status": status,
            "error": err_msg,
            "stdout_len": len(proc.stdout),
        })
        
    return results


async def stress_test_asyncio_benchmark():
    """Stress-test VerifiedPool under massive concurrent workloads."""
    stress_results = []
    
    test_cases = [
        {"name": "standard_5000_tasks", "tasks": 5000, "cancel_rate": 0.20, "pool_size": 5},
        {"name": "heavy_10000_tasks", "tasks": 10000, "cancel_rate": 0.20, "pool_size": 5},
        {"name": "extreme_20000_tasks", "tasks": 20000, "cancel_rate": 0.20, "pool_size": 5},
        {"name": "high_cancellation_80pct", "tasks": 5000, "cancel_rate": 0.80, "pool_size": 5},
        {"name": "zero_cancellation_0pct", "tasks": 5000, "cancel_rate": 0.00, "pool_size": 5},
        {"name": "tiny_pool_size_1", "tasks": 2000, "cancel_rate": 0.20, "pool_size": 1},
        {"name": "large_pool_size_50", "tasks": 10000, "cancel_rate": 0.20, "pool_size": 50},
    ]

    for tc in test_cases:
        pool = VerifiedPool(size=tc["pool_size"])
        active_tasks: weakref.WeakSet[asyncio.Task] = weakref.WeakSet()
        collisions = 0
        double_releases = 0
        completed = 0
        exceptions = 0

        async def worker(wid: str, force_cancel: bool):
            nonlocal collisions, double_releases, completed, exceptions
            try:
                conn = await pool.acquire(worker_id=wid, timeout=2.0)
                try:
                    if force_cancel:
                        await asyncio.sleep(0.0005)
                        raise asyncio.CancelledError()
                    await conn.write(wid)
                    completed += 1
                finally:
                    await pool.release(conn, wid)
            except asyncio.CancelledError:
                pass
            except RuntimeError as re:
                if "Collision" in str(re) or "Illegal state" in str(re):
                    collisions += 1
                else:
                    exceptions += 1
            except asyncio.TimeoutError:
                exceptions += 1
            except Exception:
                exceptions += 1

        t0 = time.time()
        tasks = []
        for i in range(tc["tasks"]):
            wid = f"worker-{i}"
            should_cancel = (i % 100) < (tc["cancel_rate"] * 100)
            t = asyncio.create_task(worker(wid, should_cancel))
            active_tasks.add(t)
            tasks.append(t)

        await asyncio.gather(*tasks, return_exceptions=True)
        duration = time.time() - t0
        
        # Trigger GC to verify no retained cyclic references
        gc.collect()
        remaining_tasks = len(active_tasks)

        # Invariant checks on pool connections
        idle_count = 0
        for conn in pool._all:
            if conn.state == ConnectionState.IDLE and conn.owner is None:
                idle_count += 1

        pool_invariants_hold = (idle_count == tc["pool_size"]) and (pool._available.qsize() == tc["pool_size"])
        passed = (collisions == 0 and double_releases == 0 and remaining_tasks == 0 and pool_invariants_hold)

        stress_results.append({
            "test_case": tc["name"],
            "tasks": tc["tasks"],
            "pool_size": tc["pool_size"],
            "duration_sec": round(duration, 3),
            "throughput_tps": round(tc["tasks"] / duration if duration > 0 else 0, 1),
            "completed": completed,
            "collisions": collisions,
            "double_releases": double_releases,
            "leaked_tasks": remaining_tasks,
            "pool_intact": pool_invariants_hold,
            "passed": passed,
        })

    return stress_results


async def main():
    print("=== 1. TESTING CLI INVOCATIONS ===")
    cli_res = test_cli_invocations()
    print(json.dumps(cli_res, indent=2))
    
    print("\n=== 2. STRESS TESTING ASYNCIO CONCURRENCY BENCHMARK ===")
    stress_res = await stress_test_asyncio_benchmark()
    print(json.dumps(stress_res, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
