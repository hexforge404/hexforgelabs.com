import os
import socket
import psutil
import paramiko
import subprocess
import requests
import json
import traceback

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

# ✅ Assistant imports
from .routes import mcp
from .tool_registry import TOOL_REGISTRY, register_tool
from .tools.core import save_memory_entry
from .tools import (
    get_os_info, list_usb_devices, get_logs,
    launch_freecad, launch_app, launch_file,
    run_btop, run_neofetch, check_all_tools, get_user
)
from .tools.system import ping_host

# 🌍 Environment
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")

# === Lifespan ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    from fastapi.routing import APIRoute
    print("Available routes:")
    for route in app.routes:
        if isinstance(route, APIRoute):
            print(f"{route.path} ({', '.join(route.methods)})")
    yield

# 🚀 FastAPI Init
app = FastAPI(title="HexForge Lab Assistant API", lifespan=lifespan)
app.include_router(mcp.router)

# === Schemas ===
class ChatRequest(BaseModel):
    message: str

class PingRequest(BaseModel):
    target: str

class CommandRequest(BaseModel):
    command: str

# === Helpers ===
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

def _get_ip_addresses():
    addrs = []
    try:
        for ifname, ifaddrs in psutil.net_if_addrs().items():
            for a in ifaddrs:
                if a.family == socket.AF_INET and not str(a.address).startswith("127."):
                    addrs.append({"iface": ifname, "ip": a.address})
    except Exception as e:
        addrs.append({"error": str(e)})
    return addrs

# === Chat Endpoint ===
@app.api_route("/chat", methods=["POST", "OPTIONS"])
async def assistant_chat(req: Request):
    if req.method == "OPTIONS":
        return JSONResponse({"status": "ok"})

    try:
        body = await req.json()
        message = str(body.get("message", "")).strip()
    except Exception:
        return JSONResponse({"response": "⚠️ Invalid request body"})

    if not message:
        return JSONResponse({"response": "(empty message)"})

    async def safe_wrap(result, label=None):
        """Guarantee valid JSON."""
        try:
            if isinstance(result, dict) and "response" in result:
                return JSONResponse(result)
            if isinstance(result, dict) or isinstance(result, list):
                return JSONResponse({"response": json.dumps(result, ensure_ascii=False)})
            return JSONResponse({"response": str(result)})
        except Exception as e:
            print(f"[wrap:{label}] error:", e)
            return JSONResponse({"response": f"❌ wrap error: {e}"})

    try:
        # === BASIC COMMANDS ===
        if message == "!os":
            return await safe_wrap(await get_os_info(), "os")

        elif message == "!usb":
            return await safe_wrap(await list_usb_devices(), "usb")

        elif message == "!logs":
            return await safe_wrap(await get_logs(), "logs")

        elif message.startswith("!ping "):
            target = message.split(" ", 1)[1]
            return await safe_wrap(await ping_host(target), "ping")

        elif message == "!uptime":
            return await safe_wrap(await try_subprocess(["uptime"], "uptime"))

        elif message == "!df":
            return await safe_wrap(await try_subprocess(["df", "-h"], "disk_usage"))

        elif message == "!docker":
            return await safe_wrap(await try_subprocess(["docker", "ps"], "docker_ps"))

        elif message == "!whoami":
            return await safe_wrap(await get_user(), "whoami")

        elif message == "!status":
            return await safe_wrap(await check_all_tools(), "status")

        elif message.startswith("!memory"):
            try:
                r = requests.get("http://hexforge-backend:8000/api/memory/all", timeout=5)
                data = r.json()
                return await safe_wrap({"response": json.dumps(data, ensure_ascii=False)}, "memory")
            except Exception as e:
                return JSONResponse({"response": f"⚠️ Memory API error: {e}"})

        elif message == "!help":
            return JSONResponse({
                "response": (
                    "🧠 **HexForge Assistant Commands**\n"
                    "`!os`, `!usb`, `!logs`, `!ping <host>`, `!uptime`, `!df`, "
                    "`!docker`, `!status`, `!whoami`, `!memory`"
                )
            })

        # === FALLBACK TO OLLAMA ===
        try:
            res = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": message, "stream": False},
                timeout=20,
            )
            if not res.text:
                return JSONResponse({"response": "(empty Ollama reply)"})
            data = res.json()
            reply = data.get("response") or data.get("message") or "(empty Ollama reply)"
            return JSONResponse({"response": reply})
        except Exception as e:
            print("Ollama error:", e)
            traceback.print_exc()
            return JSONResponse({"response": f"⚠️ Ollama connection failed: {e}"})

    except Exception as e:
        print("Chat handler crash:", e)
        traceback.print_exc()
        return JSONResponse({"response": f"❌ Internal error: {e}"})


# === Health & Core Routes ===
@app.get("/")
async def root():
    return {"message": "HexForge Assistant is running"}

@app.get("/health")
async def health():
    return {"status": "ok", "uptime": psutil.boot_time()}

@app.options("/health", include_in_schema=False)
async def health_options():
    return Response(status_code=204)

# === Registered Tools ===
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
        "hostname": socket.gethostname(),
        "ip": _get_ip_addresses()
    }

@app.get("/tool/list")
async def list_all_tools():
    return {"tools": TOOL_REGISTRY}

# === Main Entrypoint ===
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 11435))
    print(f"🚀 Starting HexForge Assistant on 0.0.0.0:{port}")
    uvicorn.run("assistant.main:app", host="0.0.0.0", port=port, reload=False)
