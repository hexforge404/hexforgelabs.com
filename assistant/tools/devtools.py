import subprocess
import difflib
import os
from .core import save_memory_entry
import shutil


async def run_linter(path):
    """Runs flake8 on a given file or directory."""
    try:
        output = subprocess.check_output(["flake8", path], text=True)
        result = {"lint_output": output or "No issues", "retry": False}
    except subprocess.CalledProcessError as e:
        result = {"lint_output": e.output, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("run-linter", result)
    return result

async def run_formatter(path):
    """Runs black code formatter on a file or directory."""
    try:
        output = subprocess.check_output(["black", "--check", path], stderr=subprocess.STDOUT, text=True)
        result = {"formatted": False, "output": output}
    except subprocess.CalledProcessError:
        try:
            format_output = subprocess.check_output(["black", path], stderr=subprocess.STDOUT, text=True)
            result = {"formatted": True, "output": format_output}
        except Exception as e:
            result = {"error": str(e)}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("run-formatter", result)
    return result

async def syntax_check(path):
    """Checks Python syntax using compile."""
    try:
        subprocess.check_call(["python3", "-m", "py_compile", path])
        result = {"status": "Syntax OK"}
    except subprocess.CalledProcessError as e:
        result = {"error": f"Syntax error in {path}", "details": str(e)}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("syntax-check", result)
    return result

async def preview_diff(file_a, file_b):
    """Returns a line-by-line diff between two text files."""
    try:
        with open(file_a, "r") as f1, open(file_b, "r") as f2:
            lines1 = f1.readlines()
            lines2 = f2.readlines()
            diff = list(difflib.unified_diff(lines1, lines2, fromfile=file_a, tofile=file_b))
        result = {"diff": diff}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("preview-diff", result)
    return result

async def git_status(path="."):
    """Returns git status and recent log entries from the specified path."""
    try:
        status = subprocess.check_output(["git", "-C", path, "status"], text=True)
        log = subprocess.check_output(["git", "-C", path, "log", "--oneline", "-n", "5"], text=True)
        result = {"status": status.strip(), "recent_commits": log.strip()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("git-status", result)
    return result
async def git_diff(path="."):
    """Returns the git diff for the specified path."""
    try:
        diff = subprocess.check_output(["git", "-C", path, "diff"], text=True)
        result = {"diff": diff.strip()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("git-diff", result)
    return result
async def git_log(path="."):
    """Returns the git log for the specified path."""
    try:
        log = subprocess.check_output(["git", "-C", path, "log", "--oneline"], text=True)
        result = {"log": log.strip()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("git-log", result)
    return result
async def git_branch(path="."):
    """Returns the current git branch for the specified path."""
    try:
        branch = subprocess.check_output(["git", "-C", path, "rev-parse", "--abbrev-ref", "HEAD"], text=True)
        result = {"branch": branch.strip()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("git-branch", result)
    return result

import shutil
from .core import save_memory_entry

async def check_all_tools():
    """Checks for presence of required system tools."""
    required = ["ping", "neofetch", "docker", "xdg-open", "freecad", "blender", "inkscape", "gimp", "fritzing", "kicad", "btop"]
    missing = [tool for tool in required if shutil.which(tool) is None]

    result = {
        "required": required,
        "missing": missing,
        "all_present": len(missing) == 0
    }

    await save_memory_entry("check-all-tools", result)
    return result
async def check_tool(tool):
    """Checks if a specific tool is installed."""
    try:
        path = shutil.which(tool)
        if path:
            result = {"tool": tool, "installed": True, "path": path}
        else:
            result = {"tool": tool, "installed": False}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-tool", result)
    return result
async def check_tool_version(tool):
    """Checks the version of a specific tool."""
    try:
        output = subprocess.check_output([tool, "--version"], text=True)
        version = output.strip()
        result = {"tool": tool, "version": version}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-tool-version", result)
    return result