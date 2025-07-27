import subprocess
import shutil
import webbrowser
from .core import save_memory_entry

async def launch_app(app):
    """Attempts to launch an application by name or path."""
    try:
        subprocess.Popen([app])
        result = {"status": f"{app} launched", "retry": False}
    except Exception as e:
        try:
            subprocess.Popen([app])
            result = {"status": f"{app} launched on retry", "retry": False}
        except Exception as e2:
            result = {"error": f"{app} failed after retry: {str(e2)}", "retry": True}
    await save_memory_entry("launch-app", result)
    return result

async def launch_file(path):
    """Opens a file or folder using the default system handler."""
    try:
        subprocess.Popen(["xdg-open", path])
        result = {"status": f"Opened: {path}", "retry": False}
    except Exception as e:
        try:
            subprocess.Popen(["xdg-open", path])
            result = {"status": f"Opened after retry: {path}", "retry": False}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("open-file", result)
    return result

async def launch_url(url):
    """Opens a URL in the default web browser."""
    try:
        webbrowser.open(url)
        result = {"status": f"URL opened: {url}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("open-url", result)
    return result

async def is_installed(app_name):
    """Checks if a command/application is in PATH."""
    try:
        path = shutil.which(app_name)
        result = {"app": app_name, "installed": bool(path), "path": path or "Not found"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-app-installed", result)
    return result

async def launch_freecad():
    """Shortcut to launch FreeCAD from AppImage path."""
    return await launch_app("~/AppImages/FreeCAD-0.21.2-Linux-x86_64.AppImage")

async def launch_terminal():
    """Tries to open the default terminal."""
    for terminal in ["gnome-terminal", "konsole", "xfce4-terminal", "x-terminal-emulator", "lxterminal"]:
        if shutil.which(terminal):
            return await launch_app(terminal)
    return {"error": "No known terminal emulator found."}
async def launch_file_manager():
    """Tries to open the default file manager."""
    for file_manager in ["nautilus", "dolphin", "thunar", "nemo"]:
        if shutil.which(file_manager):
            return await launch_app(file_manager)
    return {"error": "No known file manager found."}
async def launch_text_editor():
    """Tries to open the default text editor."""
    for editor in ["gedit", "kate", "leafpad", "nano"]:
        if shutil.which(editor):
            return await launch_app(editor)
    return {"error": "No known text editor found."}
