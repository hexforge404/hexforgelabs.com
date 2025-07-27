import os
import hashlib
import subprocess
from pathlib import Path
from .core import save_memory_entry

async def verify_file_hash(path, known_hash):
    """Verifies the SHA-256 hash of a file against a known hash string."""
    try:
        with open(path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        result = {"valid": file_hash == known_hash, "hash": file_hash}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("verify-file-hash", result)
    return result

async def check_file_permissions(path):
    """Returns octal permissions and owner/group of a given file."""
    try:
        st = os.stat(path)
        result = {
            "permissions": oct(st.st_mode & 0o777),
            "uid": st.st_uid,
            "gid": st.st_gid
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-file-permissions", result)
    return result

async def scan_setuid_binaries(search_path="/"):
    """Scans for setuid/setgid binaries in a given directory."""
    try:
        output = subprocess.check_output(
            ["find", search_path, "-perm", "/6000", "-type", "f"],
            stderr=subprocess.DEVNULL,
            text=True
        )
        binaries = output.strip().split("\n") if output.strip() else []
        result = {"setuid_binaries": binaries}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("scan-setuid-binaries", result)
    return result

async def check_firewall_rules():
    """Lists current iptables rules (IPv4 only)."""
    try:
        output = subprocess.check_output(["iptables", "-L", "-n", "-v"], text=True)
        result = {"firewall_rules": output}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-firewall-rules", result)
    return result

async def audit_shadow_password_lengths(min_length=8):
    """Audits /etc/shadow for accounts with short or empty hashed passwords."""
    short_or_empty = []
    try:
        with open("/etc/shadow", "r") as f:
            for line in f:
                parts = line.strip().split(":")
                if len(parts) > 1:
                    username = parts[0]
                    password_hash = parts[1]
                    if password_hash == "" or len(password_hash) < min_length:
                        short_or_empty.append({"user": username, "hash_length": len(password_hash)})
        result = {"weak_passwords": short_or_empty}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("audit-shadow-password-lengths", result)
    return result
async def check_sudoers_file():
    """Checks the /etc/sudoers file for syntax errors."""
    try:
        output = subprocess.check_output(["visudo", "-c"], text=True)
        result = {"sudoers_check": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "returncode": e.returncode}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-sudoers-file", result)
    return result
async def check_ssh_config():
    """Checks the SSH configuration for common security issues."""
    try:
        with open("/etc/ssh/sshd_config", "r") as f:
            config = f.readlines()
        issues = []
        for line in config:
            if "PermitRootLogin" in line and "no" not in line:
                issues.append(line.strip())
            if "PasswordAuthentication" in line and "no" not in line:
                issues.append(line.strip())
        result = {"ssh_issues": issues}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-ssh-config", result)
    return result