import logging

logger = logging.getLogger(__name__)
logger.info("🧩 Dispatcher version: unified full tool map loaded")

# --- Tool imports ---
from assistant.tools.system import get_os_info, get_user, get_uptime, get_disk_usage
from assistant.tools.usb import list_usb_devices
from assistant.tools.logs import get_logs
from assistant.tools.docker import get_docker_info
from assistant.tools.network import ping_host
from assistant.tools.agent import call_agent

from assistant.tools.launchers import launch_freecad, launch_app, launch_file
from assistant.tools.devtools import run_btop, run_neofetch, check_all_tools
from assistant.tools.archive import archive_files, extract_archive
from assistant.tools.packages import list_packages
from assistant.tools.process import list_processes, kill_process
from assistant.tools.security import check_ports, scan_services
from assistant.tools.scheduler import list_cron_jobs
from assistant.tools.monitor import get_cpu_info, get_mem_info
from assistant.tools.fileops import read_file, write_file

from assistant.tools.core import save_memory_entry


# --- Tool registry ---
tool_map = {
    # System & basic
    "os-info": get_os_info,
    "user": get_user,
    "usb-list": list_usb_devices,
    "logs": get_logs,
    "docker": get_docker_info,
    "agent": call_agent,
    "ping": ping_host,
    "uptime": get_uptime,
    "disk-usage": get_disk_usage,

    # Launchers
    "launch-freecad": launch_freecad,
    "launch-app": launch_app,
    "launch-file": launch_file,

    # Dev tools
    "run-btop": run_btop,
    "run-neofetch": run_neofetch,
    "check-all-tools": check_all_tools,

    # Archive management
    "archive-files": archive_files,
    "extract-archive": extract_archive,

    # Packages
    "list-packages": list_packages,

    # Process control
    "list-processes": list_processes,
    "kill-process": kill_process,

    # Security
    "check-ports": check_ports,
    "scan-services": scan_services,

    # Scheduler
    "list-cron-jobs": list_cron_jobs,

    # Monitoring
    "get-cpu-info": get_cpu_info,
    "get-mem-info": get_mem_info,

    # File I/O
    "read-file": read_file,
    "write-file": write_file,
}

# --- Dispatcher core ---
async def tool_dispatcher(tool_name, input_data):
    if tool_name not in tool_map:
        raise ValueError(f"Unknown tool: {tool_name}")

    func = tool_map[tool_name]
    result = None
    try:
        result = await func(**input_data) if input_data else await func()
    except Exception as e:
        result = {"error": str(e)}

    # Attach input to result for reference
    if isinstance(result, dict):
        result["input"] = input_data

    await save_memory_entry(tool_name, result, extra_tags=["tool-dispatch"])
    return result
