import os
import shutil
import zipfile
import tarfile
from pathlib import Path
from .core import save_memory_entry

# ✅ ZIP folder
async def zip_folder(folder_path, zip_path):
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    full_path = os.path.join(root, file)
                    arcname = os.path.relpath(full_path, folder_path)
                    zipf.write(full_path, arcname)
        result = {"status": f"Zipped to {zip_path}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("zip-folder", result)
    return result

# ✅ Extract ZIP
async def extract_zip(zip_path, extract_to):
    try:
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            zipf.extractall(extract_to)
        result = {"status": f"Extracted to {extract_to}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("extract-zip", result)
    return result

# ✅ Extract TAR (gz/xz/bz2)
async def extract_tar(tar_path, extract_to):
    try:
        with tarfile.open(tar_path, 'r:*') as tar:
            tar.extractall(path=extract_to)
        result = {"status": f"Extracted TAR to {extract_to}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("extract-tar", result)
    return result

# ✅ Create TAR.GZ
async def create_tar_gz(source_dir, output_path):
    try:
        with tarfile.open(output_path, "w:gz") as tar:
            tar.add(source_dir, arcname=os.path.basename(source_dir))
        result = {"status": f"Created TAR.GZ at {output_path}", "retry": False}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("create-tar-gz", result)
    return result

# ✅ List Archive Contents
async def list_archive_contents(path):
    try:
        if path.endswith(".zip"):
            with zipfile.ZipFile(path, "r") as zipf:
                files = zipf.namelist()
        elif path.endswith(".tar") or ".tar." in path:
            with tarfile.open(path, "r:*") as tar:
                files = tar.getnames()
        else:
            raise ValueError("Unsupported archive format.")
        result = {"files": files}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("list-archive-contents", result)
    return result

# ✅ Auto Extract
async def auto_extract(archive_path, extract_to):
    try:
        if archive_path.endswith(".zip"):
            return extract_zip(archive_path, extract_to)
        elif archive_path.endswith(".tar") or ".tar." in archive_path:
            return extract_tar(archive_path, extract_to)
        else:
            raise ValueError("Unsupported archive format.")
    except Exception as e:
        result = {"error": str(e)}
        await save_memory_entry("auto-extract", result)
        return result
# ✅ Move File
async def move_file(src, dest):
    try:
        shutil.move(src, dest)
        result = {"status": f"Moved {src} to {dest}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("move-file", result)
    return result
# ✅ Copy File
async def copy_file(src, dest):
    try:
        shutil.copy2(src, dest)
        result = {"status": f"Copied {src} to {dest}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("copy-file", result)
    return result
# ✅ Delete File
async def delete_file(file_path):
    try:
        os.remove(file_path)
        result = {"status": f"Deleted {file_path}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("delete-file", result)
    return result
# ✅ Delete Directory
async def delete_directory(dir_path):
    try:
        shutil.rmtree(dir_path)
        result = {"status": f"Deleted directory {dir_path}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("delete-directory", result)
    return result
# ✅ Create Directory
async def create_directory(dir_path):
    try:
        os.makedirs(dir_path, exist_ok=True)
        result = {"status": f"Created directory {dir_path}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("create-directory", result)
    return result
# ✅ Read File
async def read_file(file_path):
    try:
        with open(file_path, "r") as f:
            content = f.read()
        result = {"content": content, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("read-file", result)
    return result
# ✅ Write File
async def write_file(file_path, content):
    try:
        with open(file_path, "w") as f:
            f.write(content)
        result = {"status": f"Wrote to {file_path}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("write-file", result)
    return result
# ✅ Get File Size
async def get_file_size(file_path):
    try:
        size = os.path.getsize(file_path)
        result = {"size": size, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-file-size", result)
    return result
# ✅ Get Directory Size
async def get_directory_size(dir_path):
    try:
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(dir_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                total_size += os.path.getsize(fp)
        result = {"size": total_size, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-directory-size", result)
    return result
# ✅ Get File Type
async def get_file_type(file_path):
    try:
        file_type = Path(file_path).suffix
        result = {"file_type": file_type, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-file-type", result)
    return result
# ✅ Get File Permissions
async def get_file_permissions(file_path):
    try:
        permissions = oct(os.stat(file_path).st_mode)[-3:]
        result = {"permissions": permissions, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-file-permissions", result)
    return result
# ✅ Set File Permissions
async def set_file_permissions(file_path, permissions):
    try:
        os.chmod(file_path, int(permissions, 8))
        result = {"status": f"Set permissions of {file_path} to {permissions}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("set-file-permissions", result)
    return result
# ✅ Get File Owner
async def get_file_owner(file_path):
    try:
        stat_info = os.stat(file_path)
        uid = stat_info.st_uid
        gid = stat_info.st_gid
        result = {"uid": uid, "gid": gid, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("get-file-owner", result)
    return result
# ✅ Set File Owner
async def set_file_owner(file_path, uid, gid):
    try:
        os.chown(file_path, uid, gid)
        result = {"status": f"Set owner of {file_path} to UID: {uid}, GID: {gid}", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("set-file-owner", result)
    return result