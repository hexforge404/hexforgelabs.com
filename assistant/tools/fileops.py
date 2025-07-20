import datetime
import os
import shutil
from pathlib import Path
from .core import save_memory_entry

async def list_files(directory):
    """Lists all files in a given directory."""
    try:
        files = os.listdir(directory)
        result = {"files": files, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("list-files", result)
    return result

async def create_directory(path):
    """Creates a directory, including parents if needed."""
    try:
        os.makedirs(path, exist_ok=True)
        result = {"status": f"Created directory {path}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("create-directory", result)
    return result

async def delete_file(path):
    """Deletes a file."""
    try:
        os.remove(path)
        result = {"status": f"Deleted file: {path}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("delete-file", result)
    return result

async def delete_directory(path):
    """Deletes a directory and all contents."""
    try:
        shutil.rmtree(path)
        result = {"status": f"Deleted directory: {path}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("delete-directory", result)
    return result

async def read_file(path):
    """Reads and returns the content of a file."""
    try:
        with open(path, "r") as f:
            content = f.read()
        result = {"content": content}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("read-file", result)
    return result

async def write_file(path, content):
    """Writes content to a file (overwrites if exists)."""
    try:
        with open(path, "w") as f:
            f.write(content)
        result = {"status": f"Written to file: {path}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("write-file", result)
    return result

async def move_file(src, dst):
    """Moves a file or folder."""
    try:
        shutil.move(src, dst)
        result = {"status": f"Moved {src} → {dst}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("move-file", result)
    return result

async def copy_file(src, dst):
    """Copies a file to a new destination."""
    try:
        shutil.copy2(src, dst)
        result = {"status": f"Copied {src} → {dst}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("copy-file", result)
    return result

async def get_file_info(path):
    """Returns file size and modification time."""
    try:
        p = Path(path)
        result = {
            "exists": p.exists(),
            "size_bytes": p.stat().st_size,
            "modified": p.stat().st_mtime
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("file-info", result)
    return result
async def check_file_exists(path):
    """Checks if a file or directory exists."""
    try:
        exists = os.path.exists(path)
        result = {"exists": exists}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-file-exists", result)
    return result
async def get_file_type(path):
    """Returns the type of a file (file, directory, symlink)."""
    try:
        if os.path.isfile(path):
            result = {"type": "file"}
        elif os.path.isdir(path):
            result = {"type": "directory"}
        elif os.path.islink(path):
            result = {"type": "symlink"}
        else:
            result = {"type": "unknown"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-type", result)
    return result
async def get_file_permissions(path):
    """Returns the permissions of a file in octal format."""
    try:
        st = os.stat(path)
        permissions = oct(st.st_mode & 0o777)
        result = {"permissions": permissions}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-permissions", result)
    return result
async def change_file_permissions(path, mode):
    """Changes the permissions of a file."""
    try:
        os.chmod(path, mode)
        result = {"status": f"Changed permissions of {path} to {oct(mode)}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("change-file-permissions", result)
    return result
async def get_file_owner(path):
    """Returns the owner of a file."""
    try:
        st = os.stat(path)
        uid = st.st_uid
        gid = st.st_gid
        result = {"owner": {"uid": uid, "gid": gid}}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-owner", result)
    return result
async def change_file_owner(path, uid, gid):
    """Changes the owner of a file."""
    try:
        os.chown(path, uid, gid)
        result = {"status": f"Changed owner of {path} to uid: {uid}, gid: {gid}"}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("change-file-owner", result)
    return result
async def get_file_hash(path, algorithm='sha256'):
    """Returns the hash of a file using the specified algorithm."""
    import hashlib
    try:
        hash_func = getattr(hashlib, algorithm)()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_func.update(chunk)
        result = {"hash": hash_func.hexdigest()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-hash", result)
    return result
async def search_file_content(path, pattern):
    """Searches for a pattern in a file and returns matching lines."""
    try:
        with open(path, "r") as f:
            lines = [line.strip() for line in f if pattern in line]
        result = {"matches": lines}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("search-file-content", result)
    return result
async def get_file_size(path):
    """Returns the size of a file in bytes."""
    try:
        size = os.path.getsize(path)
        result = {"size_bytes": size}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-size", result)
    return result
async def get_file_age(path):
    """Returns the age of a file in days."""
    try:
        mtime = os.path.getmtime(path)
        age = (datetime.now() - datetime.fromtimestamp(mtime)).days
        result = {"age_days": age}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-age", result)
    return result
async def get_file_lines(path):
    """Returns the number of lines in a file."""
    try:
        with open(path, "r") as f:
            lines = f.readlines()
        result = {"num_lines": len(lines)}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-lines", result)
    return result
async def get_file_last_modified(path):
    """Returns the last modified time of a file."""
    try:
        mtime = os.path.getmtime(path)
        result = {"last_modified": datetime.fromtimestamp(mtime).isoformat()}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-last-modified", result)
    return result
async def get_file_first_line(path):
    """Returns the first line of a file."""
    try:
        with open(path, "r") as f:
            first_line = f.readline().strip()
        result = {"first_line": first_line}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-first-line", result)
    return result
async def get_file_last_line(path):
    """Returns the last line of a file."""
    try:
        with open(path, "r") as f:
            lines = f.readlines()
        last_line = lines[-1].strip() if lines else ""
        result = {"last_line": last_line}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-last-line", result)
    return result
async def get_file_lines_with_pattern(path, pattern):
    """Returns lines containing a specific pattern from a file."""
    try:
        with open(path, "r") as f:
            lines = [line.strip() for line in f if pattern in line]
        result = {"matches": lines}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-lines-with-pattern", result)
    return result
async def get_file_lines_count(path):
    """Returns the number of lines in a file."""
    try:
        with open(path, "r") as f:
            lines = f.readlines()
        result = {"num_lines": len(lines)}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-lines-count", result)
    return result
async def get_file_lines_with_pattern_count(path, pattern):
    """Returns the number of lines containing a specific pattern from a file."""
    try:
        with open(path, "r") as f:
            lines = [line.strip() for line in f if pattern in line]
        result = {"num_matches": len(lines)}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-lines-with-pattern-count", result)
    return result
async def get_file_lines_with_pattern_content(path, pattern):
    """Returns lines containing a specific pattern and their content from a file."""
    try:
        with open(path, "r") as f:
            lines = [line.strip() for line in f if pattern in line]
        result = {"matches": lines}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-file-lines-with-pattern-content", result)
    return result