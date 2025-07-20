import platform
import subprocess
import os
import shutil
import chardet
import requests
from datetime import datetime

# 🔒 Memory Logging
async def save_memory_entry(name, result, extra_tags=None):
    try:
        tags = ["tool"]
        category = "general"

        # Auto-categorize
        if name in ["os-info", "whoami"]:
            category = "system"
        elif name in ["usb-list", "ping"]:
            category = "network"
        elif "launched" in str(result).lower():
            category = "tool-launch"
        elif "Opened" in str(result) or name == "open-file":
            category = "file"
        elif name == "check-tools":
            category = "status"

        if isinstance(result, dict) and "error" in result:
            tags.append("error")

        if extra_tags:
            tags.extend(extra_tags)

        payload = {
            "name": name,
            "description": f"Tool: {name}",
            "type": "tool",
            "category": category,
            "tags": list(set(tags)),
            "user": "assistant",
            "timestamp": datetime.utcnow().isoformat(),
            "tool": name,
            "result": result
        }

        requests.post("http://hexforge-backend:8000/api/memory/add", json=payload, timeout=3)
    except Exception:
        pass

# 💬 Context Logger
async def save_conversation_context(message, reply, fallback=False):
    try:
        payload = {
            "name": "conversation",
            "description": f"User command: {message}",
            "type": "context",
            "category": "conversation",
            "tags": ["chat", "user", "assistant"] + (["fallback"] if fallback else []),
            "user": "user",
            "timestamp": datetime.utcnow().isoformat(),
            "tool": "conversation",
            "result": {
                "command": message,
                "response": reply
            }
        }
        requests.post("http://hexforge-backend:8000/api/memory/add", json=payload, timeout=3)
    except Exception:
        pass

# === LAUNCHERS WITH RETRY ===

async def launch_app(app):
    try:
        subprocess.Popen([app])
        result = {"status": f"{app} launched", "retry": False}
    except Exception:
        try:
            subprocess.Popen([app])
            result = {"status": f"{app} launched on retry", "retry": True}
        except Exception as e2:
            result = {"error": f"{app} failed after retry: {str(e2)}", "retry": True}
    await save_memory_entry(app, result)
    return result

async def launch_file(path):
    try:
        subprocess.Popen(["xdg-open", path])
        result = {"status": f"Opened: {path}", "retry": False}
    except Exception:
        try:
            subprocess.Popen(["xdg-open", path])
            result = {"status": f"Opened after retry: {path}", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("open-file", result)
    return result

async def launch_freecad():
    try:
        subprocess.Popen(["bash", "-c", "~/AppImages/FreeCAD-0.21.2-Linux-x86_64.AppImage"], shell=False)
        result = {"status": "FreeCAD launched", "retry": False}
    except Exception:
        try:
            subprocess.Popen(["bash", "-c", "~/AppImages/FreeCAD-0.21.2-Linux-x86_64.AppImage"], shell=False)
            result = {"status": "FreeCAD launched on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("launch-freecad", result)
    return result

# === SYSTEM INFO ===

async def get_os_info():
    result = {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor()
    }
    await save_memory_entry("os-info", result)
    return result

async def get_user():
    try:
        result = {"user": subprocess.check_output(["whoami"]).decode().strip(), "retry": False}
    except Exception:
        try:
            result = {"user": subprocess.check_output(["whoami"]).decode().strip(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("whoami", result)
    return result

# === USB & NETWORK ===

async def list_usb_devices():
    try:
        output = subprocess.check_output(['lsusb'], text=True)
        result = {"usb_devices": output.strip().split('\n'), "retry": False}
    except Exception:
        try:
            output = subprocess.check_output(['lsusb'], text=True)
            result = {"usb_devices": output.strip().split('\n'), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("usb-list", result)
    return result

async def ping_host(target):
    try:
        process = subprocess.run(['ping', '-c', '3', target], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result = {"stdout": process.stdout, "stderr": process.stderr, "retry": False}
    except Exception:
        try:
            process = subprocess.run(['ping', '-c', '3', target], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            result = {"stdout": process.stdout, "stderr": process.stderr, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("ping", {"target": target, **result})
    return result

# === LOGS ===

async def get_logs():
    try:
        if os.path.exists("/var/log/messages"):
            with open("/var/log/messages", "r") as f:
                result = {"logs": f.readlines()[-20:], "retry": False}
        elif shutil.which("journalctl"):
            output = subprocess.run(["journalctl", "-n", "20", "--no-pager"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            result = {"logs": output.stdout.strip().split("\n"), "retry": False}
        else:
            output = subprocess.run(['dmesg'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            result = {"logs": output.stdout.strip().split('\n')[-20:], "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("logs", result)
    return result

# === TERMINAL UTILITIES ===

async def run_btop():
    return await launch_app("btop")

async def run_neofetch():
    try:
        output = subprocess.check_output(["neofetch", "--stdout"]).decode().strip()
        result = {"neofetch": output, "retry": False}
    except Exception:
        try:
            output = subprocess.check_output(["neofetch", "--stdout"]).decode().strip()
            result = {"neofetch": output, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("neofetch", result)
    return result

# === TOOL STATUS CHECKER ===

async def check_all_tools():
    tools = {
        "freecad": "~/AppImages/FreeCAD-0.21.2-Linux-x86_64.AppImage",
        "blender": shutil.which("blender"),
        "inkscape": shutil.which("inkscape"),
        "gimp": shutil.which("gimp"),
        "fritzing": shutil.which("fritzing"),
        "kicad": shutil.which("kicad"),
        "firefox": shutil.which("firefox"),
        "btop": shutil.which("btop"),
        "neofetch": shutil.which("neofetch"),
        "docker": shutil.which("docker"),
    }

    results = {}
    for tool, path in tools.items():
        if path:
            results[tool] = f"✅ Found at {path}" if path.startswith("/") else "✅ Found (AppImage path assumed)"
        else:
            results[tool] = "❌ Not found"

    await save_memory_entry("check-tools", results)
    return results
# === FILE OPERATIONS ===
async def open_file(path):
    try:
        result = launch_file(path)
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("open-file", result)
    return result
async def copy_file(src, dest):
    try:
        shutil.copy(src, dest)
        result = {"status": f"Copied {src} to {dest}", "retry": False}
    except Exception as e:
        try:
            shutil.copy(src, dest)
            result = {"status": f"Copied {src} to {dest} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("copy-file", result)
    return result
async def move_file(src, dest):
    try:
        shutil.move(src, dest)
        result = {"status": f"Moved {src} to {dest}", "retry": False}
    except Exception as e:
        try:
            shutil.move(src, dest)
            result = {"status": f"Moved {src} to {dest} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("move-file", result)
    return result
async def delete_file(path):
    try:
        os.remove(path)
        result = {"status": f"Deleted {path}", "retry": False}
    except Exception as e:
        try:
            os.remove(path)
            result = {"status": f"Deleted {path} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("delete-file", result)
    return result
async def download_file(url, dest):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(dest, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        result = {"status": f"Downloaded {url} to {dest}", "retry": False}
    except requests.RequestException as e:
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            with open(dest, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            result = {"status": f"Downloaded {url} to {dest} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("download-file", result)
    return result
async def upload_file(url, file_path):
    try:
        with open(file_path, 'rb') as f:
            response = requests.post(url, files={'file': f})
            response.raise_for_status()
        result = {"status": f"Uploaded {file_path} to {url}", "retry": False}
    except requests.RequestException as e:
        try:
            with open(file_path, 'rb') as f:
                response = requests.post(url, files={'file': f})
                response.raise_for_status()
            result = {"status": f"Uploaded {file_path} to {url} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("upload-file", result)
    return result
async def list_files(directory):
    try:
        files = os.listdir(directory)
        result = {"files": files, "retry": False}
    except Exception as e:
        try:
            files = os.listdir(directory)
            result = {"files": files, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("list-files", result)
    return result
async def read_file(path):
    try:
        with open(path, 'r') as f:
            content = f.read()
        result = {"content": content, "retry": False}
    except Exception as e:
        try:
            with open(path, 'r') as f:
                content = f.read()
            result = {"content": content, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("read-file", result)
    return result
async def write_file(path, content):
    try:
        with open(path, 'w') as f:
            f.write(content)
        result = {"status": f"Wrote to {path}", "retry": False}
    except Exception as e:
        try:
            with open(path, 'w') as f:
                f.write(content)
            result = {"status": f"Wrote to {path} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("write-file", result)
    return result
async def rename_file(old_path, new_path):
    try:
        os.rename(old_path, new_path)
        result = {"status": f"Renamed {old_path} to {new_path}", "retry": False}
    except Exception as e:
        try:
            os.rename(old_path, new_path)
            result = {"status": f"Renamed {old_path} to {new_path} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("rename-file", result)
    return result
async def move_directory(src, dest):
    try:
        shutil.move(src, dest)
        result = {"status": f"Moved directory {src} to {dest}", "retry": False}
    except Exception as e:
        try:
            shutil.move(src, dest)
            result = {"status": f"Moved directory {src} to {dest} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("move-directory", result)
    return result
async def delete_directory(path):
    try:
        shutil.rmtree(path)
        result = {"status": f"Deleted directory {path}", "retry": False}
    except Exception as e:
        try:
            shutil.rmtree(path)
            result = {"status": f"Deleted directory {path} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("delete-directory", result)
    return result
async def create_directory(path):
    try:
        os.makedirs(path, exist_ok=True)
        result = {"status": f"Created directory {path}", "retry": False}
    except Exception as e:
        try:
            os.makedirs(path, exist_ok=True)
            result = {"status": f"Created directory {path} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("create-directory", result)
    return result
async def list_directory_contents(path):
    try:
        contents = os.listdir(path)
        result = {"contents": contents, "retry": False}
    except Exception as e:
        try:
            contents = os.listdir(path)
            result = {"contents": contents, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("list-directory-contents", result)
    return result
async def get_file_info(path):
    try:
        info = os.stat(path)
        result = {
            "size": info.st_size,
            "modified_time": datetime.fromtimestamp(info.st_mtime).isoformat(),
            "created_time": datetime.fromtimestamp(info.st_ctime).isoformat(),
            "accessed_time": datetime.fromtimestamp(info.st_atime).isoformat(),
            "retry": False
        }
    except Exception as e:
        try:
            info = os.stat(path)
            result = {
                "size": info.st_size,
                "modified_time": datetime.fromtimestamp(info.st_mtime).isoformat(),
                "created_time": datetime.fromtimestamp(info.st_ctime).isoformat(),
                "accessed_time": datetime.fromtimestamp(info.st_atime).isoformat(),
                "retry": True
            }
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-info", result)
    return result
async def get_directory_info(path):
    try:
        info = os.stat(path)
        result = {
            "size": info.st_size,
            "modified_time": datetime.fromtimestamp(info.st_mtime).isoformat(),
            "created_time": datetime.fromtimestamp(info.st_ctime).isoformat(),
            "accessed_time": datetime.fromtimestamp(info.st_atime).isoformat(),
            "retry": False
        }
    except Exception as e:
        try:
            info = os.stat(path)
            result = {
                "size": info.st_size,
                "modified_time": datetime.fromtimestamp(info.st_mtime).isoformat(),
                "created_time": datetime.fromtimestamp(info.st_ctime).isoformat(),
                "accessed_time": datetime.fromtimestamp(info.st_atime).isoformat(),
                "retry": True
            }
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-info", result)
    return result
async def get_file_hash(path, algorithm='sha256'):
    import hashlib
    try:
        hash_func = getattr(hashlib, algorithm)()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_func.update(chunk)
        result = {"hash": hash_func.hexdigest(), "retry": False}
    except Exception as e:
        try:
            hash_func = getattr(hashlib, algorithm)()
            with open(path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_func.update(chunk)
            result = {"hash": hash_func.hexdigest(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-hash", result)
    return result
async def get_directory_hash(path, algorithm='sha256'):
    import hashlib
    try:
        hash_func = getattr(hashlib, algorithm)()
        for root, dirs, files in os.walk(path):
            for file in sorted(files):
                file_path = os.path.join(root, file)
                with open(file_path, 'rb') as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        hash_func.update(chunk)
        result = {"hash": hash_func.hexdigest(), "retry": False}
    except Exception as e:
        try:
            hash_func = getattr(hashlib, algorithm)()
            for root, dirs, files in os.walk(path):
                for file in sorted(files):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'rb') as f:
                        for chunk in iter(lambda: f.read(4096), b""):
                            hash_func.update(chunk)
            result = {"hash": hash_func.hexdigest(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-hash", result)
    return result
async def get_file_permissions(path):
    try:
        permissions = oct(os.stat(path).st_mode)[-3:]
        result = {"permissions": permissions, "retry": False}
    except Exception as e:
        try:
            permissions = oct(os.stat(path).st_mode)[-3:]
            result = {"permissions": permissions, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-permissions", result)
    return result
async def set_file_permissions(path, mode):
    try:
        os.chmod(path, int(mode, 8))
        result = {"status": f"Set permissions of {path} to {mode}", "retry": False}
    except Exception as e:
        try:
            os.chmod(path, int(mode, 8))
            result = {"status": f"Set permissions of {path} to {mode} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("set-file-permissions", result)
    return result
async def get_directory_permissions(path):
    try:
        permissions = oct(os.stat(path).st_mode)[-3:]
        result = {"permissions": permissions, "retry": False}
    except Exception as e:
        try:
            permissions = oct(os.stat(path).st_mode)[-3:]
            result = {"permissions": permissions, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-permissions", result)
    return result
async def set_directory_permissions(path, mode):
    try:
        os.chmod(path, int(mode, 8))
        result = {"status": f"Set permissions of {path} to {mode}", "retry": False}
    except Exception as e:
        try:
            os.chmod(path, int(mode, 8))
            result = {"status": f"Set permissions of {path} to {mode} on retry", "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("set-directory-permissions", result)
    return result
async def get_file_type(path):
    try:
        file_type = subprocess.check_output(['file', '--mime-type', path]).decode().strip()
        result = {"file_type": file_type, "retry": False}
    except Exception as e:
        try:
            file_type = subprocess.check_output(['file', '--mime-type', path]).decode().strip()
            result = {"file_type": file_type, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-type", result)
    return result
async def get_directory_type(path):
    try:
        dir_type = subprocess.check_output(['file', '--mime-type', path]).decode().strip()
        result = {"dir_type": dir_type, "retry": False}
    except Exception as e:
        try:
            dir_type = subprocess.check_output(['file', '--mime-type', path]).decode().strip()
            result = {"dir_type": dir_type, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-type", result)
    return result
async def get_file_encoding(path):
    try:
        with open(path, 'rb') as f:
            raw_data = f.read()
        result = {"encoding": chardet.detect(raw_data)['encoding'], "retry": False}
    except Exception as e:
        try:
            with open(path, 'rb') as f:
                raw_data = f.read()
            result = {"encoding": chardet.detect(raw_data)['encoding'], "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-encoding", result)
    return result
async def get_directory_encoding(path):
    try:
        with open(path, 'rb') as f:
            raw_data = f.read()
        result = {"encoding": chardet.detect(raw_data)['encoding'], "retry": False}
    except Exception as e:
        try:
            with open(path, 'rb') as f:
                raw_data = f.read()
            result = {"encoding": chardet.detect(raw_data)['encoding'], "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-encoding", result)
    return result
async def get_file_size(path):
    try:
        size = os.path.getsize(path)
        result = {"size": size, "retry": False}
    except Exception as e:
        try:
            size = os.path.getsize(path)
            result = {"size": size, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-size", result)
    return result
async def get_directory_size(path):
    try:
        size = sum(os.path.getsize(os.path.join(root, file)) for root, dirs, files in os.walk(path) for file in files)
        result = {"size": size, "retry": False}
    except Exception as e:
        try:
            size = sum(os.path.getsize(os.path.join(root, file)) for root, dirs, files in os.walk(path) for file in files)
            result = {"size": size, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-size", result)
    return result
async def get_file_last_modified(path):
    try:
        last_modified = os.path.getmtime(path)
        result = {"last_modified": datetime.fromtimestamp(last_modified).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_modified = os.path.getmtime(path)
            result = {"last_modified": datetime.fromtimestamp(last_modified).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-last-modified", result)
    return result
async def get_directory_last_modified(path):
    try:
        last_modified = os.path.getmtime(path)
        result = {"last_modified": datetime.fromtimestamp(last_modified).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_modified = os.path.getmtime(path)
            result = {"last_modified": datetime.fromtimestamp(last_modified).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-last-modified", result)
    return result
async def get_file_last_accessed(path):
    try:
        last_accessed = os.path.getatime(path)
        result = {"last_accessed": datetime.fromtimestamp(last_accessed).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_accessed = os.path.getatime(path)
            result = {"last_accessed": datetime.fromtimestamp(last_accessed).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-last-accessed", result)
    return result
async def get_directory_last_accessed(path):
    try:
        last_accessed = os.path.getatime(path)
        result = {"last_accessed": datetime.fromtimestamp(last_accessed).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_accessed = os.path.getatime(path)
            result = {"last_accessed": datetime.fromtimestamp(last_accessed).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-last-accessed", result)
    return result
async def get_file_owner(path):
    try:
        owner = os.stat(path).st_uid
        result = {"owner": owner, "retry": False}
    except Exception as e:
        try:
            owner = os.stat(path).st_uid
            result = {"owner": owner, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-owner", result)
    return result
async def get_directory_owner(path):
    try:
        owner = os.stat(path).st_uid
        result = {"owner": owner, "retry": False}
    except Exception as e:
        try:
            owner = os.stat(path).st_uid
            result = {"owner": owner, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-owner", result)
    return result
async def get_file_group(path):
    try:
        group = os.stat(path).st_gid
        result = {"group": group, "retry": False}
    except Exception as e:
        try:
            group = os.stat(path).st_gid
            result = {"group": group, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-group", result)
    return result
async def get_directory_group(path):
    try:
        group = os.stat(path).st_gid
        result = {"group": group, "retry": False}
    except Exception as e:
        try:
            group = os.stat(path).st_gid
            result = {"group": group, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-group", result)
    return result
async def get_file_inode(path):
    try:
        inode = os.stat(path).st_ino
        result = {"inode": inode, "retry": False}
    except Exception as e:
        try:
            inode = os.stat(path).st_ino
            result = {"inode": inode, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-inode", result)
    return result
async def get_directory_inode(path):
    try:
        inode = os.stat(path).st_ino
        result = {"inode": inode, "retry": False}
    except Exception as e:
        try:
            inode = os.stat(path).st_ino
            result = {"inode": inode, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-inode", result)
    return result
async def get_file_link_count(path):
    try:
        link_count = os.stat(path).st_nlink
        result = {"link_count": link_count, "retry": False}
    except Exception as e:
        try:
            link_count = os.stat(path).st_nlink
            result = {"link_count": link_count, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-link-count", result)
    return result
async def get_directory_link_count(path):
    try:
        link_count = os.stat(path).st_nlink
        result = {"link_count": link_count, "retry": False}
    except Exception as e:
        try:
            link_count = os.stat(path).st_nlink
            result = {"link_count": link_count, "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-link-count", result)
    return result
async def get_file_access_time(path):
    try:
        access_time = os.path.getatime(path)
        result = {"access_time": datetime.fromtimestamp(access_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            access_time = os.path.getatime(path)
            result = {"access_time": datetime.fromtimestamp(access_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-access-time", result)
    return result
async def get_directory_access_time(path):
    try:
        access_time = os.path.getatime(path)
        result = {"access_time": datetime.fromtimestamp(access_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            access_time = os.path.getatime(path)
            result = {"access_time": datetime.fromtimestamp(access_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-access-time", result)
    return result
async def get_file_change_time(path):
    try:
        change_time = os.path.getctime(path)
        result = {"change_time": datetime.fromtimestamp(change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            change_time = os.path.getctime(path)
            result = {"change_time": datetime.fromtimestamp(change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-change-time", result)
    return result
async def get_directory_change_time(path):
    try:
        change_time = os.path.getctime(path)
        result = {"change_time": datetime.fromtimestamp(change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            change_time = os.path.getctime(path)
            result = {"change_time": datetime.fromtimestamp(change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-change-time", result)
    return result
async def get_file_creation_time(path):
    try:
        creation_time = os.path.getctime(path)
        result = {"creation_time": datetime.fromtimestamp(creation_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            creation_time = os.path.getctime(path)
            result = {"creation_time": datetime.fromtimestamp(creation_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-creation-time", result)
    return result
async def get_directory_creation_time(path):
    try:
        creation_time = os.path.getctime(path)
        result = {"creation_time": datetime.fromtimestamp(creation_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            creation_time = os.path.getctime(path)
            result = {"creation_time": datetime.fromtimestamp(creation_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-creation-time", result)
    return result
async def get_file_last_status_change(path):
    try:
        last_status_change = os.path.getctime(path)
        result = {"last_status_change": datetime.fromtimestamp(last_status_change).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change = os.path.getctime(path)
            result = {"last_status_change": datetime.fromtimestamp(last_status_change).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-last-status-change", result)
    return result
async def get_directory_last_status_change(path):
    try:
        last_status_change = os.path.getctime(path)
        result = {"last_status_change": datetime.fromtimestamp(last_status_change).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change = os.path.getctime(path)
            result = {"last_status_change": datetime.fromtimestamp(last_status_change).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-last-status-change", result)
    return result
async def get_file_last_status_change_time(path):
    try:
        last_status_change_time = os.path.getctime(path)
        result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change_time = os.path.getctime(path)
            result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-last-status-change-time", result)
    return result
async def get_directory_last_status_change_time(path):
    try:
        last_status_change_time = os.path.getctime(path)
        result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change_time = os.path.getctime(path)
            result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-last-status-change-time", result)
    return result
async def get_file_last_status_change_time(path):
    try:
        last_status_change_time = os.path.getctime(path)
        result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change_time = os.path.getctime(path)
            result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-last-status-change-time", result)
    return result
async def get_directory_last_status_change_time(path):
    try:
        last_status_change_time = os.path.getctime(path)
        result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change_time = os.path.getctime(path)
            result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-last-status-change-time", result)
    return result
async def get_file_last_status_change_time(path):
    try:
        last_status_change_time = os.path.getctime(path)
        result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change_time = os.path.getctime(path)
            result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-file-last-status-change-time", result)
    return result
async def get_directory_last_status_change_time(path):
    try:
        last_status_change_time = os.path.getctime(path)
        result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": False}
    except Exception as e:
        try:
            last_status_change_time = os.path.getctime(path)
            result = {"last_status_change_time": datetime.fromtimestamp(last_status_change_time).isoformat(), "retry": True}
        except Exception as e2:
            result = {"error": str(e2), "retry": True}
    await save_memory_entry("get-directory-last-status-change-time", result)
    return result