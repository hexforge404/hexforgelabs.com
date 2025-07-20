import psutil
from datetime import datetime
from .core import save_memory_entry
import subprocess

async def system_metrics():
    """Returns system-wide metrics: CPU, memory, and disk usage."""
    try:
        result = {
            "cpu": psutil.cpu_percent(interval=0.5),
            "memory": psutil.virtual_memory()._asdict(),
            "disk": psutil.disk_usage("/")._asdict(),
            "retry": False
        }
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("system-metrics", result)
    return result

async def detailed_cpu():
    """Returns per-core CPU usage and system load average."""
    try:
        result = {
            "per_core": psutil.cpu_percent(percpu=True, interval=0.5),
            "load_avg": psutil.getloadavg()
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("detailed-cpu", result)
    return result

async def network_io():
    """Returns total bytes sent and received on all interfaces."""
    try:
        io = psutil.net_io_counters(pernic=True)
        result = {iface: stats._asdict() for iface, stats in io.items()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("network-io", result)
    return result

async def boot_time():
    """Returns the system's boot time."""
    try:
        bt = datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S")
        result = {"boot_time": bt}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("boot-time", result)
    return result

async def top_processes_by_memory(limit=5):
    """Returns top N memory-consuming processes."""
    try:
        procs = sorted(psutil.process_iter(['pid', 'name', 'memory_info']), 
                       key=lambda p: p.info['memory_info'].rss if p.info['memory_info'] else 0,
                       reverse=True)[:limit]
        result = {
            "top_processes": [
                {
                    "pid": p.info['pid'],
                    "name": p.info['name'],
                    "mem_rss": p.info['memory_info'].rss
                } for p in procs
            ]
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("top-processes", result)
    return result
async def top_processes_by_cpu(limit=5):
    """Returns top N CPU-consuming processes."""
    try:
        procs = sorted(psutil.process_iter(['pid', 'name', 'cpu_percent']), 
                       key=lambda p: p.info['cpu_percent'] if p.info['cpu_percent'] else 0,
                       reverse=True)[:limit]
        result = {
            "top_processes": [
                {
                    "pid": p.info['pid'],
                    "name": p.info['name'],
                    "cpu_percent": p.info['cpu_percent']
                } for p in procs
            ]
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("top-processes-cpu", result)
    return result
async def disk_partitions():
    """Returns disk partitions and their usage."""
    try:
        partitions = psutil.disk_partitions()
        result = {
            "partitions": [
                {
                    "device": p.device,
                    "mountpoint": p.mountpoint,
                    "fstype": p.fstype,
                    "opts": p.opts,
                    "usage": psutil.disk_usage(p.mountpoint)._asdict()
                } for p in partitions
            ]
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("disk-partitions", result)
    return result

async def network_interfaces():
    """Returns network interfaces and their addresses."""
    try:
        interfaces = psutil.net_if_addrs()
        result = {
            "interfaces": {
                iface: [
                    {
                        "family": addr.family.name,
                        "address": addr.address,
                        "netmask": addr.netmask,
                        "broadcast": addr.broadcast
                    } for addr in addrs
                ] for iface, addrs in interfaces.items()
            }
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("network-interfaces", result)
    return result

async def run_btop():
    """Launches btop in subprocess."""
    try:
        subprocess.run(["btop"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("btop", result)
    return result
async def run_htop():
    """Launches htop in subprocess."""
    try:
        subprocess.run(["htop"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("htop", result)
    return result
async def run_glances():
    """Launches glances in subprocess."""
    try:
        subprocess.run(["glances"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("glances", result)
    return result
async def run_nmon():
    """Launches nmon in subprocess."""
    try:
        subprocess.run(["nmon"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("nmon", result)
    return result
async def run_vtop():
    """Launches vtop in subprocess."""
    try:
        subprocess.run(["vtop"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("vtop", result)
    return result
async def run_glances_web():
    """Launches glances in web mode."""
    try:
        subprocess.run(["glances", "-w"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("glances-web", result)
    return result
async def run_nmon_web():
    """Launches nmon in web mode."""
    try:
        subprocess.run(["nmon", "-w"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("nmon-web", result)
    return result
async def run_vtop_web():
    """Launches vtop in web mode."""
    try:
        subprocess.run(["vtop", "-w"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("vtop-web", result)
    return result
async def run_btop_web():
    """Launches btop in web mode."""
    try:
        subprocess.run(["btop", "-w"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("btop-web", result)
    return result
async def run_htop_web():
    """Launches htop in web mode."""
    try:
        subprocess.run(["htop", "-w"])
        result = {"status": "launched"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("htop-web", result)
    return result

async def run_neofetch():
    """Runs neofetch and returns its output."""
    try:
        output = subprocess.check_output(["neofetch", "--stdout"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("neofetch", result)
    return result
async def run_screenfetch():
    """Runs screenfetch and returns its output."""
    try:
        output = subprocess.check_output(["screenfetch", "--stdout"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("screenfetch", result)
    return result
async def run_ufetch():
    """Runs ufetch and returns its output."""
    try:
        output = subprocess.check_output(["ufetch", "--stdout"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("ufetch", result)
    return result
async def run_asciiquarium():
    """Runs asciiquarium and returns its output."""
    try:
        output = subprocess.check_output(["asciiquarium"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("asciiquarium", result)
    return result
async def run_cmatrix():
    """Runs cmatrix and returns its output."""
    try:
        output = subprocess.check_output(["cmatrix"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("cmatrix", result)
    return result
async def run_sl():
    """Runs sl and returns its output."""
    try:
        output = subprocess.check_output(["sl"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("sl", result)
    return result
async def run_ponysay():
    """Runs ponysay and returns its output."""
    try:
        output = subprocess.check_output(["ponysay"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("ponysay", result)
    return result
async def run_ponysay_ascii():
    """Runs ponysay in ASCII mode and returns its output."""
    try:
        output = subprocess.check_output(["ponysay", "--ascii"], text=True)
        result = {"output": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("ponysay-ascii", result)
    return result