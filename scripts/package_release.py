#!/usr/bin/env python3
"""Build the release archive and notes for a tagged version.
Adapted from LabelPlus/PS-Script (15a695a, by sgqy) to this fork's
conventions (zip archive, LabelPlus_Ps_Script.jsx + ps_script_res).
Requires npm ci first (see .github/workflows/release.yml)."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent


def find_bash() -> str:
    """Locate a usable bash. On Windows, prefer Git's bundled bash because
    System32's bash.exe is the WSL stub and can't run the build script."""
    if os.name == "nt":
        try:
            exec_path = subprocess.run(["git", "--exec-path"], capture_output=True,
                                       text=True, check=True).stdout.strip()
            candidate = Path(exec_path).parents[2] / "bin" / "bash.exe"
            if candidate.is_file():
                return str(candidate)
        except Exception:
            pass
    return shutil.which("bash") or "bash"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tag", help="Release tag, e.g. 1.7.9 or v1.7.9")
    args = parser.parse_args()
    if not re.fullmatch(r"v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", args.tag):
        parser.error("tag must be a stable version such as 1.7.9 or v1.7.9")
    version = args.tag.removeprefix("v")

    # extract the release notes for this version from CHANGELOG.md
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    sections = list(re.finditer(r"^## \[([^\]]+)\][^\n]*$", changelog, re.MULTILINE))
    section = next((s for s in sections if s[1] == version), None)
    if section is None:
        parser.error("CHANGELOG.md has no section matching the release version")
    end = next((s.start() for s in sections if s.start() > section.start()), len(changelog))
    notes = changelog[section.start():end].strip()
    if not any(line.strip() and not line.startswith("#") for line in notes.splitlines()):
        parser.error("release notes are empty; update CHANGELOG.md first")

    # the tagged tree must already carry the right version
    version_file = ROOT / "src/version.ts"
    if f'VERSION: string = "{version}"' not in version_file.read_text(encoding="utf-8"):
        parser.error("src/version.ts does not match the release tag")

    # build
    subprocess.run([find_bash(), "./build.sh"], cwd=ROOT, check=True)

    # pack: same layout as published assets
    # (LabelPlus_Ps_Script.jsx + ps_script_res)
    build = ROOT / "build"
    (build / "release-notes.md").write_text(notes + "\n", encoding="utf-8")
    archive = build / f"LabelPlus_PS-Script_{version}.zip"
    subprocess.run([sys.executable, str(ROOT / "pack_zip.py"),
                    str(archive),
                    str(build / "LabelPlus_Ps_Script.jsx"),
                    str(build / "ps_script_res")], cwd=ROOT, check=True)
    print(f"Release archive: {archive}")


if __name__ == "__main__":
    main()
