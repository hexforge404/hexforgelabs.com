import subprocess
import socket
import psutil
from .core import save_memory_entry

async def ping_host(target="8.8.8.8", count=3):
    host = target  # alias

    """Pings a host and returns latency output."""
    try:
        output = subprocess.check_output(["ping", "-c", str(count), host], text=True)
        result = {"target": target, "output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "returncode": e.returncode}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("ping-host", result)
    return result

async def get_uptime():
    """Returns system uptime using `uptime` command."""
    try:
        output = subprocess.check_output(["uptime"], text=True)
        result = {"output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "returncode": e.returncode}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("uptime", result)
    return result

async def get_disk_usage():
    """Returns disk usage using `df -h`."""
    try:
        output = subprocess.check_output(["df", "-h"], text=True)
        result = {"output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "returncode": e.returncode}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("disk-usage", result)
    return result
