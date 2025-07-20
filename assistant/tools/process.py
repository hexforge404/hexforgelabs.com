import psutil
from .core import save_memory_entry

async def list_processes():
    """Returns a list of active processes with PID, name, CPU %, and memory usage (RSS)."""
    try:
        processes = [
            {
                "pid": p.pid,
                "name": p.name(),
                "cpu": p.cpu_percent(interval=0.1),
                "mem": p.memory_info().rss
            }
            for p in psutil.process_iter()
        ]
        result = {"processes": processes, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("list-processes", result)
    return result

async def find_process_by_name(name_substring):
    """Finds all running processes with names containing the given substring."""
    try:
        matches = [
            {
                "pid": p.pid,
                "name": p.name(),
                "cmdline": p.cmdline()
            }
            for p in psutil.process_iter()
            if name_substring.lower() in p.name().lower()
        ]
        result = {"matches": matches}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("find-process-by-name", result)
    return result

async def kill_process(pid):
    """Attempts to terminate the given PID."""
    try:
        proc = psutil.Process(pid)
        proc.terminate()
        proc.wait(timeout=3)
        result = {"status": f"Process {pid} terminated successfully."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("kill-process", result)
    return result

async def get_process_tree(pid):
    """Returns the process tree (children) of a given PID."""
    try:
        proc = psutil.Process(pid)
        children = proc.children(recursive=True)
        tree = [{"pid": c.pid, "name": c.name()} for c in children]
        result = {"tree": tree}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-process-tree", result)
    return result
