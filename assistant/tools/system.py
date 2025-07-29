import os
import platform
import socket
import time
import getpass
import psutil
from datetime import datetime
import asyncio
import shutil

async def get_os_info():
    return {
        "system": platform.system(),
        "node_name": platform.node(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "platform": platform.platform(),
    }

async def get_user():
    return getpass.getuser()

async def get_system_info():
    return {
        "cpu_count": psutil.cpu_count(logical=True),
        "cpu_count_physical": psutil.cpu_count(logical=False),
        "boot_time": datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S"),
        "uptime_seconds": time.time() - psutil.boot_time(),
    }

async def get_system_uptime():
    uptime_seconds = time.time() - psutil.boot_time()
    return {
        "uptime_seconds": uptime_seconds,
        "uptime_human": time.strftime("%H:%M:%S", time.gmtime(uptime_seconds)),
    }

async def get_system_load():
    if hasattr(os, "getloadavg"):
        load1, load5, load15 = os.getloadavg()
        return {
            "1_min": load1,
            "5_min": load5,
            "15_min": load15,
        }
    else:
        return {"error": "Load average not supported on this OS."}

async def get_system_hostname():
    return socket.gethostname()

async def get_system_time():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

async def get_system_timezone():
    return time.tzname

async def get_system_users():
    return [u.name for u in psutil.users()]

async def get_system_groups():
    try:
        import grp
        return [g.gr_name for g in grp.getgrall()]
    except ImportError:
        return {"error": "grp module not available on this OS."}

async def get_system_processes():
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent']):
        try:
            processes.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return processes

async def get_system_services():
    try:
        import subprocess
        output = subprocess.check_output(['systemctl', 'list-units', '--type=service', '--state=running'], text=True)
        return output.strip().split("\n")[1:]
    except Exception as e:
        return {"error": str(e)}

async def get_system_memory():
    mem = psutil.virtual_memory()
    return {
        "total": mem.total,
        "available": mem.available,
        "used": mem.used,
        "percent": mem.percent
    }

async def get_system_cpu():
    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "cpu_times": psutil.cpu_times()._asdict(),
    }

async def get_system_gpu():
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        return [{
            "name": gpu.name,
            "load": gpu.load,
            "memory_total": gpu.memoryTotal,
            "memory_used": gpu.memoryUsed,
            "temperature": gpu.temperature,
        } for gpu in gpus]
    except ImportError:
        return {"error": "GPUtil not installed"}
    except Exception as e:
        return {"error": str(e)}

async def get_system_power():
    try:
        battery = psutil.sensors_battery()
        if battery:
            return {
                "percent": battery.percent,
                "plugged_in": battery.power_plugged,
                "secs_left": battery.secsleft,
            }
        return {"info": "No battery found"}
    except Exception as e:
        return {"error": str(e)}

async def ping_host(target: str = "8.8.8.8"):
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", "-c", "3", target,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return {
            "target": target,
            "stdout": stdout.decode().strip(),
            "stderr": stderr.decode().strip(),
            "exit_code": proc.returncode
        }
    except Exception as e:
        return {"error": str(e)}

async def get_disk_usage():
    total, used, free = shutil.disk_usage("/")
    return {
        "total": f"{total // (2**30)} GB",
        "used": f"{used // (2**30)} GB",
        "free": f"{free // (2**30)} GB"
    }

get_uptime = get_system_uptime
