import subprocess
import os
import shutil
from datetime import datetime, timedelta
from .core import save_memory_entry

async def get_logs():
    """Returns the last ~20 lines of system logs using the best available method."""
    try:
        if os.path.exists("/var/log/messages"):
            with open("/var/log/messages", "r") as f:
                result = {"logs": f.readlines()[-20:], "retry": False}
        elif shutil.which("journalctl"):
            output = subprocess.run(["journalctl", "-n", "20"], capture_output=True, text=True)
            result = {"logs": output.stdout.strip().split("\n")}
        else:
            output = subprocess.run(["dmesg"], capture_output=True, text=True)
            result = {"logs": output.stdout.strip().split("\n")[-20:]}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("logs", result)
    return result

async def search_logs(keyword):
    """Search logs for a keyword using journalctl or /var/log/messages."""
    try:
        if shutil.which("journalctl"):
            output = subprocess.run(["journalctl", "|", "grep", keyword], shell=True, capture_output=True, text=True)
            lines = output.stdout.strip().split("\n") if output.stdout else []
        elif os.path.exists("/var/log/messages"):
            with open("/var/log/messages", "r") as f:
                lines = [line for line in f if keyword in line]
        else:
            output = subprocess.run(["dmesg"], capture_output=True, text=True)
            lines = [line for line in output.stdout.strip().split("\n") if keyword in line]
        result = {"matches": lines[-20:]}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("search-logs", result)
    return result

async def export_recent_logs(path="/tmp/hexforge_logs.txt", limit=100):
    """Exports the most recent log lines to a file."""
    try:
        if shutil.which("journalctl"):
            output = subprocess.run(["journalctl", "-n", str(limit)], capture_output=True, text=True)
            log_data = output.stdout
        elif os.path.exists("/var/log/messages"):
            with open("/var/log/messages", "r") as f:
                log_data = "".join(f.readlines()[-limit:])
        else:
            output = subprocess.run(["dmesg"], capture_output=True, text=True)
            log_data = "\n".join(output.stdout.strip().split("\n")[-limit:])

        with open(path, "w") as out:
            out.write(log_data)
        result = {"exported_to": path, "lines_written": len(log_data.splitlines())}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("export-logs", result)
    return result
async def clear_logs():
    """Clears system logs using journalctl or by truncating /var/log/messages."""
    try:
        if shutil.which("journalctl"):
            subprocess.run(["sudo", "journalctl", "--rotate"])
            subprocess.run(["sudo", "journalctl", "--vacuum-time=1s"])
            result = {"status": "Logs cleared using journalctl"}
        elif os.path.exists("/var/log/messages"):
            with open("/var/log/messages", "w") as f:
                f.truncate(0)
            result = {"status": "Logs cleared from /var/log/messages"}
        else:
            result = {"error": "No log clearing method available"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("clear-logs", result)
    return result
async def get_log_size(path="/var/log/messages"):
    """Returns the size of the log file in bytes."""
    try:
        if os.path.exists(path):
            size = os.path.getsize(path)
            result = {"size": size, "retry": False}
        else:
            result = {"error": f"{path} does not exist", "retry": True}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-log-size", result)
    return result
async def get_log_age(path="/var/log/messages"):
    """Returns the age of the log file in days."""
    try:
        if os.path.exists(path):
            mtime = os.path.getmtime(path)
            age = datetime.now() - datetime.fromtimestamp(mtime)
            result = {"age_days": age.days, "retry": False}
        else:
            result = {"error": f"{path} does not exist", "retry": True}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-log-age", result)
    return result
async def get_log_stats(path="/var/log/messages"):
    """Returns statistics about the log file."""
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                lines = f.readlines()
            num_lines = len(lines)
            num_errors = sum(1 for line in lines if "error" in line.lower())
            result = {"num_lines": num_lines, "num_errors": num_errors, "retry": False}
        else:
            result = {"error": f"{path} does not exist", "retry": True}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-log-stats", result)
    return result
async def get_log_summary(path="/var/log/messages"):
    """Returns a summary of the log file."""
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                lines = f.readlines()
            num_lines = len(lines)
            num_errors = sum(1 for line in lines if "error" in line.lower())
            last_line = lines[-1] if lines else ""
            result = {
                "num_lines": num_lines,
                "num_errors": num_errors,
                "last_line": last_line.strip(),
                "retry": False
            }
        else:
            result = {"error": f"{path} does not exist", "retry": True}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-log-summary", result)
    return result
async def get_log_errors(path="/var/log/messages"):
    """Returns the last 20 error lines from the log file."""
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                lines = [line for line in f if "error" in line.lower()]
            result = {"errors": lines[-20:], "retry": False}
        else:
            result = {"error": f"{path} does not exist", "retry": True}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-log-errors", result)
    return result
async def get_log_warnings(path="/var/log/messages"):
    """Returns the last 20 warning lines from the log file."""
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                lines = [line for line in f if "warning" in line.lower()]
            result = {"warnings": lines[-20:], "retry": False}
        else:
            result = {"error": f"{path} does not exist", "retry": True}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-log-warnings", result)
    return result
async def get_log_info(path="/var/log/messages"):
    """Returns the last 20 info lines from the log file."""
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                lines = [line for line in f if "info" in line.lower()]
            result = {"info": lines[-20:], "retry": False}
        else:
            result = {"error": f"{path} does not exist", "retry": True}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-log-info", result)
    return result