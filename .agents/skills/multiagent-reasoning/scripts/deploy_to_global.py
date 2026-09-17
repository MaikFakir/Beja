"""Deployment script to copy the multiagent-reasoning skill package to global config."""
import os
import shutil
import sys
from pathlib import Path

SRC_DIR = Path(r"C:\Users\Molarte\.gemini\antigravity\scratch\multiagent_reasoning").resolve()
DST_DIR = Path(r"C:\Users\Molarte\.gemini\config\skills\multiagent-reasoning").resolve()

def deploy():
    print(f"Deploying multiagent-reasoning skill:")
    print(f"  Source: {SRC_DIR}")
    print(f"  Destination: {DST_DIR}")
    
    if not SRC_DIR.exists():
        print(f"ERROR: Source directory does not exist: {SRC_DIR}", file=sys.stderr)
        return 1
        
    if DST_DIR.exists():
        print(f"Cleaning existing destination: {DST_DIR}")
        shutil.rmtree(DST_DIR)
        
    print("Copying files (excluding .agents, *.pyc, __pycache__, .git)...")
    shutil.copytree(
        SRC_DIR,
        DST_DIR,
        ignore=shutil.ignore_patterns(
            '.agents',
            '*.pyc',
            '__pycache__',
            '.git',
            'PROJECT.md',
            'TEST_INFRA.md',
            'TEST_READY.md'
        )
    )
    
    # Count copied files
    copied_files = [f for f in DST_DIR.rglob('*') if f.is_file()]
    print(f"Successfully deployed {len(copied_files)} files to {DST_DIR}:")
    for f in sorted(copied_files):
        rel = f.relative_to(DST_DIR)
        print(f"  - {rel}")
        
    # Run validation on the deployed target
    validate_script = DST_DIR / "scripts" / "validate_skill.py"
    if validate_script.exists():
        print("\nRunning validation script on deployed target...")
        import subprocess
        result = subprocess.run(
            [sys.executable, str(validate_script), "--target-dir", str(DST_DIR), "--strict"],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.returncode != 0:
            print(result.stderr, file=sys.stderr)
            return result.returncode
            
    print("\nDeployment and validation complete!")
    return 0

if __name__ == '__main__':
    sys.exit(deploy())
