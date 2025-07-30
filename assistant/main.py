import os
import socket
import psutil
import paramiko
import subprocess
import requests

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from starlette.middleware.cors import ALL_METHODS

# ✅ Fixed assistant-prefixed imports
from assistant.routes import mcp
from assistant.tool_registry import TOOL_REGISTRY, register_tool
from assistant.tools.core import save_memory_entry
from assistant.tools import (
    get_os_info, list_usb_devices, get_logs,
    launch_freecad, launch_app, launch_file,
    run_btop, run_neofetch, check_all_tools, get_user
)
from fastapi import FastAPI

app = FastAPI()


# 🌍 Environment
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")



async def list_open_ports():
    """Lists all open TCP and UDP ports using `ss` or fallback to `netstat`."""
    try:
        try:
            output = subprocess.check_output(["ss", "-tuln"], text=True)
        except FileNotFoundError:
            output = subprocess.check_output(["netstat", "-tuln"], text=True)
        result = {"ports": output, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("list-open-ports", result)
    return result

async def get_hostname():
    """Returns the system's hostname."""
    try:
        hostname = socket.gethostname()
        result = {"hostname": hostname}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-hostname", result)
    return result

async def get_ip_addresses():
    """Returns a list of IP addresses assigned to this machine."""
    try:
        ip_addrs = []
        for interface, snics in psutil.net_if_addrs().items():
            for snic in snics:
                if snic.family == socket.AF_INET:
                    ip_addrs.append({"interface": interface, "ip": snic.address})
        result = {"ips": ip_addrs}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("get-ip-addresses", result)
    return result

async def ping_host(host="8.8.8.8", count=3):
    """Pings a host and returns latency output."""
    try:
        output = subprocess.check_output(["ping", "-c", str(count), host], text=True)
        result = {"host": host, "output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "returncode": e.returncode}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("ping-host", result)
    return result

@asynccontextmanager
async def lifespan(app: FastAPI):
    from fastapi.routing import APIRoute
    print("Available routes:")
    for route in app.routes:
        if isinstance(route, APIRoute):
            print(f"{route.path} ({', '.join(route.methods)})")
    yield  # Lifespan continues here

# 🚀 FastAPI Init
app = FastAPI(title="HexForge Lab Assistant API", lifespan=lifespan)

# Include router after app initialization
app.include_router(mcp.router)

# 🌐 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hexforgelabs.com",
        "https://assistant.hexforgelabs.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)




# 🧾 Schemas
class ChatRequest(BaseModel):
    message: str

class PingRequest(BaseModel):
    target: str

class CommandRequest(BaseModel):
    command: str

async def try_subprocess(cmd, tool_name):
    try:
        output = subprocess.check_output(cmd, text=True)
        result = {"output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "returncode": e.returncode}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry(tool_name, result)
    return result







# 💬 /chat POST endpoint
@app.api_route("/chat", methods=["POST", "OPTIONS"])
async def assistant_chat(req: Request):
    if req.method == "OPTIONS":
        return {"status": "ok"}

    body = await req.json()
    message = body.get("message", "").strip()

    # === COMMANDS ===
    if message == "!os":
        return await get_os_info()

    elif message == "!usb":
        return await list_usb_devices()

    elif message == "!logs":
        return await get_logs()

    elif message.startswith("!ping "):
        return await ping_host(message.split(" ", 1)[1])

    elif message == "!uptime":
        return await try_subprocess(["uptime"], "uptime")

    elif message == "!df":
        return await try_subprocess(["df", "-h"], "disk_usage")

    elif message == "!docker":
        return await try_subprocess(["docker", "ps"], "docker_ps")

    elif message == "!freecad":
        return await launch_freecad()

    elif message == "!blender":
        return await launch_app("blender")

    elif message == "!firefox":
        return await launch_app("firefox")

    elif message == "!inkscape":
        return await launch_app("inkscape")

    elif message == "!gimp":
        return await launch_app("gimp")

    elif message == "!fritzing":
        return await launch_app("fritzing")

    elif message == "!kicad":
        return await launch_app("kicad")

    elif message == "!btop":
        return await run_btop()

    elif message == "!neofetch":
        return await run_neofetch()

    elif message == "!status":
        return await check_all_tools()

    elif message == "!whoami":
        return await get_user()

    elif message.startswith("!open "):
        return await launch_file(message.split(" ", 1)[1])

    elif message == "!help":
        return {
            "response": (
                "**🧠 HexForge Lab Assistant Help**\n\n"
                "🧰 **System Tools**\n"
                "`!os` `!usb` `!logs` `!ping <host>` `!uptime` `!df` `!docker` `!whoami`\n\n"
                "🖥️ **Launch Apps**\n"
                "`!freecad` `!blender` `!inkscape` `!gimp` `!fritzing` `!kicad` `!firefox`\n\n"
                "📊 **Status & Monitoring**\n"
                "`!status` — check installed tools\n"
                "`!btop` `!neofetch`\n\n"
                "🗂️ **Files**\n"
                "`!open /path/to/file`\n\n"
                "🧠 **Memory**\n"
                "`!memory`, `!memory summary`, `!memory last <tool>`\n"
                "`!memory search <term>`, `!memory delete <tool>`, `!memory clear <tool>`"
            )
        }

    # === MEMORY BASED COMMANDS ===
    elif message == "!memory":
        try:
            res = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
            data = res.json()
            if isinstance(data, list):
                entries = data[-10:]
            elif isinstance(data, dict) and "entries" in data:
                entries = data["entries"][-10:]
            else:
                return {"error": "Unexpected memory format"}
            
            if not entries:
                return {"response": "🧠 No memory entries found yet."}
            
            return {
                "response": "\n\n".join(
                    f"[{e['timestamp']}] {e['tool']} → {str(e['result'])[:300]}" for e in entries
                )
            }
        except Exception as e:
            return {"error": f"Memory fetch failed: {str(e)}"}

    elif message == "!memory summary":
        try:
            res = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
            data = res.json()
            entries = data.get("entries", []) if isinstance(data, dict) else data
            tool_counts = {}
            errors = []
            recent = []
            for e in entries[-20:]:
                tool = e.get("tool", "unknown")
                tool_counts[tool] = tool_counts.get(tool, 0) + 1
                if isinstance(e.get("result"), dict) and "error" in e["result"]:
                    errors.append(f"{tool} → {e['result']['error']}")
                recent.append(tool)
            most_common = max(tool_counts, key=tool_counts.get, default="None")
            summary = (
                f"🧠 Memory Summary:\n"
                f"- Unique tools used: {len(tool_counts)}\n"
                f"- Most used tool: {most_common} ({tool_counts.get(most_common)}x)\n"
                f"- Recent tools: {', '.join(recent[-5:])}\n"
                f"- Errors found: {len(errors)}\n"
            )
            if errors:
                summary += "\n❌ Last Errors:\n" + "\n".join(errors[-3:])
            return {"response": summary}
        except Exception as e:
            return {"error": f"Summary fetch failed: {str(e)}"}

    elif message.startswith("!memory last "):
        tool_name = message.split(" ", 2)[2]
        try:
            res = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
            data = res.json()
            entries = data.get("entries", []) if isinstance(data, dict) else data
            for e in reversed(entries):
                if e.get("tool") == tool_name:
                    return {"response": f"[{e['timestamp']}] {tool_name} → {str(e['result'])[:300]}"}
            return {"response": f"No memory found for tool: {tool_name}"}
        except Exception as e:
            return {"error": f"Fetch failed: {str(e)}"}

    elif message.startswith("!memory search "):
        keyword = message.split(" ", 2)[2].lower()
        try:
            res = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
            data = res.json()
            entries = data.get("entries", []) if isinstance(data, dict) else data
            results = [
                f"[{e['timestamp']}] {e['tool']} → {str(e['result'])[:200]}"
                for e in entries
                if keyword in str(e.get("tool", "")).lower() or keyword in str(e.get("result", "")).lower()
            ]
            return {"response": "\n\n".join(results[:5]) or f"No results for '{keyword}'"}
        except Exception as e:
            return {"error": f"Search failed: {str(e)}"}

    elif message.startswith("!memory delete "):
        tool_name = message.split(" ", 2)[2]
        try:
            res = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
            data = res.json()
            entries = data.get("entries", []) if isinstance(data, dict) else data
            for e in reversed(entries):
                if e.get("tool") == tool_name:
                    requests.delete(f"http://hexforge-backend:8000/api/memory/{e['id']}")
                    return {"response": f"Deleted memory entry for {tool_name}"}
            return {"response": f"No memory found for tool: {tool_name}"}
        except Exception as e:
            return {"error": f"Delete failed: {str(e)}"}

    elif message.startswith("!memory clear "):
        tool_name = message.split(" ", 2)[2]
        try:
            res = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
            data = res.json()
            entries = data.get("entries", []) if isinstance(data, dict) else data
            count = 0
            for e in entries:
                if e.get("tool") == tool_name:
                    requests.delete(f"http://hexforge-backend:8000/api/memory/{e['id']}")
                    count += 1
            return {"response": f"Cleared {count} entries for {tool_name}" if count else f"No memory found for {tool_name}"}
        except Exception as e:
            return {"error": f"Clear failed: {str(e)}"}

    elif message == "!memory test-entry":
        try:
            test_entry = {
                "tool": "test-tool",
                "result": {"message": "This is a test memory entry from !memory test-entry"}
            }
            res = requests.post("http://hexforge-backend:8000/api/memory/add", json=test_entry, timeout=5)
            if res.status_code == 200:
                return {"response": "✅ Test memory entry created successfully."}
            return {"error": f"Backend responded with status code {res.status_code}"}
        except Exception as e:
            return {"error": f"Test entry failed: {str(e)}"}

    elif message == "!memory help":
        return {
            "response": (
                "**🧠 Memory Commands Help**\n"
                "`!memory` — View last 10 memory entries\n"
                "`!memory summary` — Summary of memory usage\n"
                "`!memory last <tool>` — Show last entry for tool\n"
                "`!memory search <keyword>` — Find keyword in memory\n"
                "`!memory delete <tool>` — Delete most recent for tool\n"
                "`!memory clear <tool>` — Delete all entries for tool\n"
                "`!memory test-entry` — Insert a test entry\n"
            )
        }

    # === FALLBACK TO OLLAMA ===
    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": message, "stream": False},
            timeout=30
        )
        return {"response": res.json().get("response", "(No reply)")}
    except Exception as e:
        return {"error": str(e)}


# === ENDPOINTS ===

@app.get("/")
async def root():
    return {"message": "HexForge Assistant is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.options("/health", include_in_schema=False)
async def health_options():
    return Response(status_code=204)

@app.get("/tool/os-info")
@register_tool("os-info", "OS Info", category="System")
async def tool_os():
    return await get_os_info()

@app.get("/tool/usb-list")
@register_tool("usb-list", "List USB Devices", category="System")
async def tool_usb():
    return await list_usb_devices()

@app.get("/tool/logs")
@register_tool("logs", "Fetch Logs", category="System")
async def tool_logs():
    return await get_logs()

@app.post("/tool/ping")
@register_tool("ping", "Ping Host", category="Network", method="POST")
async def tool_ping(req: PingRequest):
    return await ping_host(req.target)

@app.get("/tool/uptime")
@register_tool("uptime", "System Uptime", category="System")
async def tool_uptime():
    return await try_subprocess(["uptime"], "uptime")

@app.get("/tool/df")
@register_tool("df", "Disk Usage", category="System")
async def tool_df():
    return await try_subprocess(["df", "-h"], "disk_usage")

@app.get("/tool/docker")
@register_tool("docker", "Docker Status", category="System")
async def tool_docker():
    return await try_subprocess(["docker", "ps"], "docker_ps")

@app.get("/tool/freecad")
@register_tool("freecad", "Launch FreeCAD", category="Apps")
async def tool_freecad():
    return await launch_freecad()

@app.get("/tool/blender")
@register_tool("blender", "Launch Blender", category="Apps")
async def tool_blender():
    return await launch_app("blender")

@app.get("/tool/inkscape")
@register_tool("inkscape", "Launch Inkscape", category="Apps")
async def tool_inkscape():
    return await launch_app("inkscape")

@app.get("/tool/gimp")
@register_tool("gimp", "Launch GIMP", category="Apps")
async def tool_gimp():
    return await launch_app("gimp")

@app.get("/tool/fritzing")
@register_tool("fritzing", "Launch Fritzing", category="Apps")
async def tool_fritzing():
    return await launch_app("fritzing")

@app.get("/tool/kicad")
@register_tool("kicad", "Launch KiCad", category="Apps")
async def tool_kicad():
    return await launch_app("kicad")

@app.get("/tool/firefox")
@register_tool("firefox", "Launch Firefox", category="Apps")
async def tool_firefox():
    return await launch_app("firefox")

@app.get("/tool/btop")
@register_tool("btop", "Run btop", category="Monitoring")
async def tool_btop():
    return await run_btop()

@app.get("/tool/neofetch")
@register_tool("neofetch", "Run Neofetch", category="Monitoring")
async def tool_neofetch():
    return await run_neofetch()

@app.get("/tool/status")
@register_tool("status", "Check Installed Tools", category="Monitoring")
async def tool_status():
    return await check_all_tools()

@app.get("/tool/whoami")
@register_tool("whoami", "Current User", category="System")
async def tool_whoami():
    return await get_user()

@app.get("/tool/memory")
@register_tool("memory", "Memory Log", category="Memory")
async def tool_memory():
    try:
        res = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
        data = res.json()
        entries = data["entries"][-10:] if isinstance(data, dict) else data[-10:]
        return {"entries": entries}
    except Exception as e:
        return {"error": f"Memory fetch failed: {str(e)}"}

@app.get("/tool/open")
@register_tool("open", "Open File", category="Files")
async def tool_open(file_path: str):
    try:
        if os.path.exists(file_path):
            subprocess.Popen(["xdg-open", file_path])
            return {"status": "success", "message": f"Opened {file_path}"}
        return {"status": "error", "message": f"{file_path} does not exist"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/tool/ollama")
@register_tool("ollama", "Ollama Models", category="AI")
async def tool_ollama():
    try:
        res = requests.get(f"{OLLAMA_URL}/api/models", timeout=5)
        return {"models": res.json()}
    except Exception as e:
        return {"error": str(e)}

@app.get("/tool/debug")
@register_tool("debug", "Debug Info", category="System")
async def tool_debug():
    return {
        "os": await get_os_info(),
        "user": await get_user(),
        "hostname": await get_hostname(),
        "ip": await get_ip_addresses()
    }

@app.get("/tool/list")
async def list_all_tools():
    return {"tools": TOOL_REGISTRY}
