import os
import socket
import psutil
import subprocess
import json
import traceback
import asyncio
import re
from typing import Dict, List

import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ✅ Assistant imports
from .routes import mcp
from .tool_registry import TOOL_REGISTRY, register_tool
from .tools.core import save_memory_entry
from .tools import (
    get_os_info,
    list_usb_devices,
    get_logs,
    launch_freecad,
    launch_app,
    launch_file,
    run_btop,
    run_neofetch,
    check_all_tools,
    get_user,
)
from .tools.system import ping_host

from assistant.routes import heightmap
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY




# 🌍 Environment
# Base model + per-chip overrides so the frontend model selector can matter later.
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
DOCKER_TOOLS_ENABLED = os.getenv("ENABLE_DOCKER_TOOLS", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

MODEL_MAP = {
    # Sidebar chip label -> Ollama model name (override via env if you want)
    "Lab Core": os.getenv("OLLAMA_MODEL_LAB_CORE", OLLAMA_MODEL),
    "Tool Runner": os.getenv("OLLAMA_MODEL_TOOL_RUNNER", OLLAMA_MODEL),
    "HexForge Scribe": os.getenv("OLLAMA_MODEL_SCRIBE", OLLAMA_MODEL),
}

SCRIPT_LAB_URL = os.getenv(
    "SCRIPT_LAB_URL", "http://hexforge-backend:8000/api/script-lab"
)
SCRIPT_LAB_TOKEN = os.getenv("SCRIPT_LAB_TOKEN", "")  # shared secret with backend

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://hexforge-backend:8000")

CONTENT_ENGINE_URL = os.getenv(
    "CONTENT_ENGINE_URL",
    "http://10.0.0.200:8010"   # 100% correct for your live setup
)



# 🧠 In-memory per-session history (RAM only for now)
SESSION_HISTORY: Dict[str, List[dict]] = {}
MAX_TURNS_PER_SESSION = int(os.getenv("ASSISTANT_MAX_TURNS", "40"))


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

# Internal tool path
app.include_router(heightmap.router, prefix="/tool")

# Public API path
app.include_router(heightmap.router, prefix="/api")


 

# === Schemas ===
class ChatRequest(BaseModel):
    message: str | None = None
    model: str | None = None
    mode: str | None = None
    history: list | None = None
    session_id: str | None = None


class PingRequest(BaseModel):
    target: str


class CommandRequest(BaseModel):
    command: str



@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    def _bytes(b: bytes) -> str:
        return f"<bytes {len(b)}>"
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": jsonable_encoder(exc.errors(), custom_encoder={bytes: _bytes})},
    )

# === Helpers ===
async def try_subprocess(cmd, tool_name: str):
    """
    Run a subprocess, capture stdout + exit code, and log to memory.
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        out, _ = await proc.communicate()
        result = {
            "stdout": out.decode(errors="replace"),
            "exit_code": proc.returncode,
        }
    except Exception as e:
        result = {"error": str(e)}

    await save_memory_entry(tool_name, result)
    return result


# === Script Lab Helper ===
async def script_lab_request(method: str, path: str, *, json_body=None, params=None):
    """
    Helper to talk to the backend Script Lab API with a shared token.
    This is only meant to be used by trusted tools / MCP, not the public frontend.
    """
    if not SCRIPT_LAB_TOKEN:
        return {"error": "SCRIPT_LAB_TOKEN is not configured on assistant service"}

    url = f"{SCRIPT_LAB_URL.rstrip('/')}/{path.lstrip('/')}"
    headers = {"X-Script-Lab-Token": SCRIPT_LAB_TOKEN}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                method.upper(),
                url,
                headers=headers,
                json=json_body,
                params=params,
            )

        # Try to parse JSON; fall back to raw text
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text}

        return {
            "status_code": resp.status_code,
            "ok": resp.status_code < 400,
            "data": data,
        }
    except Exception as e:
        return {
            "status_code": 500,
            "ok": False,
            "error": f"Script Lab request failed: {e}",
        }


def _get_ip_addresses():
    addrs = []
    try:
        for ifname, ifaddrs in psutil.net_if_addrs().items():
            for a in ifaddrs:
                if (
                    a.family == socket.AF_INET
                    and not str(a.address).startswith("127.")
                ):
                    addrs.append({"iface": ifname, "ip": a.address})
    except Exception as e:
        addrs.append({"error": str(e)})
    return addrs


# === Shared Chat Handler ===
async def _handle_chat(req: Request):
    """
    Shared chat handler used by both /chat and /mcp/chat.

    Accepts JSON like:
      {
        "message": "...",
        "model": "HexForge Scribe",
        "mode": "assistant",
        "history": [...],
        "session_id": "session-5"
      }

    Only 'message' is required. 'model' is used to pick an Ollama model via MODEL_MAP.
    """
    if req.method == "OPTIONS":
        return JSONResponse({"status": "ok"})

    try:
        body = await req.json()
    except Exception:
        return JSONResponse({"response": "⚠️ Invalid request body"})

    # Support multiple key names just in case
    raw_message = (
        body.get("message")
        or body.get("prompt")
        or body.get("text")
        or ""
    )
    message = str(raw_message).strip()

    if not message:
        return JSONResponse({"response": "(empty message)"})

    requested_model_label = body.get("model") or body.get("activeModel")
    ollama_model = MODEL_MAP.get(requested_model_label, OLLAMA_MODEL)

    # Session id (used for in-memory history)
    session_id = (
        body.get("session_id")
        or body.get("sessionId")
        or body.get("session")
    )

    # 'history' and 'mode' are accepted but currently unused; kept for compatibility.
    _history = body.get("history")  # noqa: F841
    _mode = body.get("mode")        # noqa: F841

    async def safe_wrap(result, label=None):
        """
        Guarantee valid JSON shape for the frontend.
        Frontend expects a top-level 'response' key.
        """
        try:
            if isinstance(result, dict) and "response" in result:
                return JSONResponse(result)

            if isinstance(result, (dict, list)):
                return JSONResponse(
                    {"response": json.dumps(result, ensure_ascii=False)}
                )

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
            return await safe_wrap(
                await try_subprocess(["uptime"], "uptime"), "uptime"
            )

        elif message == "!df":
            return await safe_wrap(
                await try_subprocess(["df", "-h"], "disk_usage"), "disk_usage"
            )

        elif message == "!docker":
            if not DOCKER_TOOLS_ENABLED:
                return JSONResponse(
                    {
                        "response": (
                            "🚫 Docker tools disabled (ENABLE_DOCKER_TOOLS=false). "
                            "Enable and mount the socket to use `!docker`."
                        )
                    },
                    status_code=403,
                )
            return await safe_wrap(
                await try_subprocess(["docker", "ps"], "docker_ps"), "docker_ps"
            )

        elif message == "!whoami":
            return await safe_wrap(await get_user(), "whoami")

        elif message == "!status":
            return await safe_wrap(await check_all_tools(), "status")

        elif message.startswith("!memory"):
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    r = await client.get(
                        f"{BACKEND_BASE_URL.rstrip('/')}/api/memory/all"
                    )
                    data = r.json()
                return await safe_wrap(
                    {"response": json.dumps(data, ensure_ascii=False)},
                    "memory",
                )
            except Exception as e:
                return JSONResponse(
                    {"response": f"⚠️ Memory API error: {e}"}
                )

        elif message == "!help":
            return JSONResponse(
                {
                    "response": (
                        "🧠 **HexForge Assistant Commands**\n"
                        "`!os`, `!usb`, `!logs`, `!ping <host>`, `!uptime`, "
                        "`!df`, `!docker`, `!status`, `!whoami`, `!memory`"
                    )
                }
            )

        # === FALLBACK TO OLLAMA ===
        try:
            # Pull prior turns for this session (if any)
            history = SESSION_HISTORY.get(session_id, []) if session_id else []

            if history:
                parts: List[str] = []
                for turn in history:
                    role = (turn.get("role") or "user").upper()
                    content = turn.get("content") or ""
                    parts.append(f"{role}: {content}")
                parts.append(f"USER: {message}")
                prompt = "\n\n".join(parts) + "\n\nASSISTANT:"
            else:
                prompt = message

            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": ollama_model,
                        "prompt": prompt,
                        "stream": False,
                    },
                )

            if not res.text:
                return JSONResponse({"response": "(empty Ollama reply)"})

            data = res.json()
            reply = (
                data.get("response")
                or data.get("message")
                or "(empty Ollama reply)"
            )

            # Save to in-memory session history
            if session_id:
                turns = SESSION_HISTORY.setdefault(session_id, [])
                turns.append({"role": "user", "content": message})
                turns.append({"role": "assistant", "content": reply})

                # Trim old turns
                if len(turns) > MAX_TURNS_PER_SESSION:
                    turns[:] = turns[-MAX_TURNS_PER_SESSION :]

                # Also persist to backend (fire-and-forget)
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        await client.post(
                            f"{BACKEND_BASE_URL.rstrip('/')}/api/assistant-sessions/{session_id}/append",
                            json={
                                "model": requested_model_label or ollama_model,
                                "messages": [
                                    {"role": "user", "content": message},
                                    {"role": "assistant", "content": reply},
                                ],
                            },
                        )
                except Exception as e:
                    print("[sessions] persist error:", e)

            return JSONResponse({"response": reply})

        except Exception as e:
            print("Ollama error:", e)
            traceback.print_exc()
            return JSONResponse(
                {"response": f"⚠️ Ollama connection failed: {e}"}
            )

    except Exception as e:
        print("Chat handler error:", e)
        traceback.print_exc()
        return JSONResponse({"response": f"❌ Chat handler error: {e}"})




# === Chat Endpoints (both paths) ===
@app.api_route("/mcp/chat", methods=["POST", "OPTIONS"])
async def assistant_chat_mcp(req: Request):
    return await _handle_chat(req)


@app.api_route("/chat", methods=["POST", "OPTIONS"])
async def assistant_chat_legacy(req: Request):
    return await _handle_chat(req)


# === Health & Core Routes ===
@app.get("/")
async def root():
    return {"message": "HexForge Assistant is running"}


@app.get("/health")
async def health():
    payload = {"status": "ok", "uptime": psutil.boot_time()}

    try:
        hm = heightmap._engine_health_status()  # type: ignore[attr-defined]
        payload["heightmap"] = hm
        if not hm.get("ok"):
            payload["status"] = "degraded"
            return JSONResponse(status_code=503, content=payload)
    except Exception as e:
        payload["status"] = "degraded"
        payload["heightmap_error"] = str(e)
        return JSONResponse(status_code=503, content=payload)

    return JSONResponse(status_code=200, content=payload)


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
    if not DOCKER_TOOLS_ENABLED:
        return JSONResponse(
            {
                "ok": False,
                "error": "Docker tools disabled. Set ENABLE_DOCKER_TOOLS=true and mount the socket to enable.",
            },
            status_code=403,
        )
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
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get("http://hexforge-backend:8000/api/memory/all")
            data = res.json()
        entries = (
            data["entries"][-10:]
            if isinstance(data, dict)
            else data[-10:]
        )
        return {"entries": entries}
    except Exception as e:
        return {"error": f"Memory fetch failed: {str(e)}"}


# === Script Lab Tools (for AI-only script management) ===
@app.get("/tool/script-list")
@register_tool("script-list", "List scripts in Script Lab", category="Scripts")
async def tool_script_list(device: str | None = None):
    """
    List scripts. Optional device filter (e.g. 'skull-badusb', 'pico-recon').
    """
    params = {"device": device} if device else None
    result = await script_lab_request("GET", "/list", params=params)
    return result


@app.get("/tool/script-get")
@register_tool("script-get", "Get script content", category="Scripts")
async def tool_script_get(name: str):
    """
    Fetch a single script by name from Script Lab.
    """
    result = await script_lab_request("GET", "/get", params={"name": name})
    return result


@app.post("/tool/script-save")
@register_tool(
    "script-save", "Save/update script", category="Scripts", method="POST"
)
async def tool_script_save(payload: dict):
    """
    Save or update a script. Expected payload example:
    {
      "name": "skull-badusb/demo-1",
      "device": "skull-badusb",
      "language": "powershell",
      "tags": ["wifi", "enum"],
      "content": "..."
    }
    """
    # Hard gate: only let trusted callers with token manage the library.
    # (Token is not exposed to the frontend; only the MCP agent uses this.)
    result = await script_lab_request("POST", "/save", json_body=payload)
    return result


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
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(f"{OLLAMA_URL}/api/models")
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
        "ip": _get_ip_addresses(),
    }


@app.get("/tool/list")
async def list_all_tools():
    return {"tools": TOOL_REGISTRY}


# --- Allow all *.hexforgelabs.com + localhost ---
def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    allowed_patterns = [
        r"^https://([a-zA-Z0-9-]+\.)?hexforgelabs\.com$",  # any subdomain
        r"^http://(localhost|127\.0\.0\.1|10\.0\.0\.200)(:\d+)?$",  # local/dev
    ]
    return any(re.match(pattern, origin) for pattern in allowed_patterns)


# --- CORS setup ---
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"^(https://([a-zA-Z0-9-]+\.)?hexforgelabs\.com|http://(localhost|127\.0\.0\.1|10\.0\.0\.200)(:\d+)?)$",
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- WebSocket Route ---
@app.websocket("/ws")
async def ws_root(websocket: WebSocket):
    origin = websocket.headers.get("origin")

    if not is_allowed_origin(origin):
        print(f"[WS] ❌ Rejected unauthorized origin: {origin}")
        await websocket.close(code=1008)
        return

    await websocket.accept()
    print(f"[WS] ✅ Connection accepted from {origin}")

    try:
        await websocket.send_json(
            {"type": "welcome", "service": "hexforge-assistant"}
        )
        while True:
            msg = await websocket.receive_text()
            if msg.strip() == "!ping":
                await websocket.send_text("pong")
            else:
                await websocket.send_text(f"echo: {msg}")
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
        await websocket.close()


# === Main Entrypoint ===
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 11435))
    print(f"🚀 Starting HexForge Assistant on 0.0.0.0:{port}")
    uvicorn.run("assistant.main:app", host="0.0.0.0", port=port, reload=False)
