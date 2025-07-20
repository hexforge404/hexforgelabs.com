import subprocess
import shutil
from .core import save_memory_entry

async def list_usb_devices():
    """Uses lsusb to return a list of connected USB devices (Linux only)."""
    try:
        if not shutil.which("lsusb"):
            raise EnvironmentError("lsusb not found. Please install usbutils.")

        output = subprocess.check_output(["lsusb"], text=True)
        devices = output.strip().split("\n")
        result = {"devices": devices}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("usb-list", result)
    return result

async def usb_tree():
    """Returns a detailed tree-like structure of USB devices using lsusb -t."""
    try:
        output = subprocess.check_output(["lsusb", "-t"], text=True)
        result = {"usb_tree": output.strip().splitlines()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("usb-tree", result)
    return result

async def usb_device_info(bus, device):
    """Returns verbose info about a specific USB device from lsusb -v."""
    try:
        output = subprocess.check_output(["lsusb", "-s", f"{bus}:{device}", "-v"], text=True)
        result = {"info": output}
    except subprocess.CalledProcessError:
        result = {"error": "Permission denied or invalid device. Try sudo or check IDs."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("usb-info", result)
    return result
async def usb_device_info_all():
    """Returns verbose info about all USB devices from lsusb -v."""
    try:
        output = subprocess.check_output(["lsusb", "-v"], text=True)
        result = {"info": output}
    except subprocess.CalledProcessError:
        result = {"error": "Permission denied. Try sudo."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("usb-info-all", result)
    return result
async def usb_device_info_by_id(vendor_id, product_id):
    """Returns verbose info about a specific USB device by vendor and product ID."""
    try:
        output = subprocess.check_output(["lsusb", "-d", f"{vendor_id}:{product_id}", "-v"], text=True)
        result = {"info": output}
    except subprocess.CalledProcessError:
        result = {"error": "Permission denied or invalid device. Try sudo or check IDs."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("usb-info-by-id", result)
    return result