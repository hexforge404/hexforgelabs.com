import os
import json
import httpx
from urllib.parse import urlparse

from fastapi import APIRouter
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from starlette.responses import StreamingResponse

# ✅ Assistant-aware imports
from ..tools.dispatcher import tool_dispatcher
from assistant.tools.core import save_memory_entry
from assistant.tools.agent import call_agent, AGENTS

# === 🌐 Configuration ===
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
AGENT_API_URL = os.getenv("AGENT_API_URL", "https://agent.hexforgelabs.com")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api/generate")

parsed_url = urlparse(AGENT_API_URL)
if not parsed_url.scheme or not parsed_url.netloc:
    raise ValueError(f"Invalid AGENT_API_URL: {AGENT_API_URL}")

router = APIRouter()

# === 🧠 Chat tool aliases ===
command_aliases = {
    "usb": "usb-list",
    "os": "os-info",
    "logs": "logs",
    "df": "df",
    "uptime": "uptime",
    "docker": "docker",
    "user": "user",
    "ping": "ping",
    "freecad": "launch-freecad",
    "open": "launch-app",
    "openfile": "launch-file",
    "btop": "run-btop",
    "neofetch": "run-neofetch",
    "status": "check-all-tools",
    "archive": "archive-files",
    "extract": "extract-archive",
    "packages": "list-packages",
    "ps": "list-processes",
    "kill": "kill-process",
    "setuid": "scan-setuid-binaries",
    "firewall": "check-firewall-rules",
    "cpu": "get-cpu-info",
    "mem": "get-mem-info",
    "read": "read-file",
    "write": "write-file",
}

# === 🩺 Health ===
@router.get("/mcp/health")
async def mcp_health():
    return {"status": "mcp ok"}


# === 📦 Request models ===
class MCPInvokeRequest(BaseModel):
    tool: str
    input: dict = Field(default_factory=dict)


class MCPChatRequest(BaseModel):
    prompt: str | None = None
    message: str | None = None

    def text(self) -> str:
        return (self.prompt or self.message or "").strip()


class MCPAgentRequest(BaseModel):
    agent: str
    prompt: str


# === 📡 POST /mcp/invoke ===
@router.post("/mcp/invoke")
async def mcp_invoke(request: MCPInvokeRequest):
    try:
        result = await tool_dispatcher(request.tool, request.input)
        return {"status": "success", "tool": request.tool, "output": result}
    except Exception as e:
        return {"status": "error", "tool": request.tool, "error": str(e)}


# === 💬 POST /mcp/chat ===
@router.post("/mcp/chat")
async def mcp_chat(req: MCPChatRequest):
    prompt = req.text()
    if not prompt:
        return JSONResponse(
            content={"detail": "Missing 'prompt' or 'message' field."}, status_code=422
        )

    print(f"[DEBUG] Incoming prompt: {prompt}")

    try:
        result = None
        if prompt.startswith("!"):
            parts = prompt[1:].split(" ", 1)
            cmd = parts[0]
            arg = parts[1].strip() if len(parts) > 1 else ""

            print(f"[DEBUG] Command mode: {cmd} | Arg: {arg}")

            if cmd == "ping":
                result = await tool_dispatcher("ping", {"target": arg or "8.8.8.8"})
            elif cmd in command_aliases:
                tool = command_aliases[cmd]
                result = await tool_dispatcher(tool, {})
            else:
                result = {"error": f"Unknown command: {cmd}"}
        else:
            result = await tool_dispatcher("agent", {"prompt": prompt})
            await save_memory_entry("agent", result, extra_tags=["chat"])

        if isinstance(result, (dict, list)):
            return JSONResponse(content={"response": result})
        return JSONResponse(content={"response": str(result)})

    except Exception as e:
        import traceback
        print(f"[ERROR] Exception in /mcp/chat:\n{traceback.format_exc()}")
        return JSONResponse(
            content={
                "status": "error",
                "tool": prompt,
                "output": f"(internal error) {str(e)}",
            },
            status_code=500,
        )


# === 🧠 POST /mcp/stream ===
@router.post("/mcp/stream")
async def mcp_stream(req: MCPChatRequest):
    prompt = req.text()
    if not prompt:
        return JSONResponse(
            content={"detail": "Missing 'prompt' or 'message' field."}, status_code=422
        )
    print(f"[DEBUG] Incoming stream prompt: {prompt}")
    full_output = ""

    async def stream_gen():
        nonlocal full_output
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST", OLLAMA_API_URL, json={"model": OLLAMA_MODEL, "prompt": prompt}
            ) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        full_output += line + "\n"
                        yield f"event: message\ndata: {line}\n\n"

    async def generator_with_memory():
        async for line in stream_gen():
            yield line
        await save_memory_entry(
            "agent", {"prompt": prompt, "response": full_output}
        )

    return StreamingResponse(generator_with_memory(), media_type="text/event-stream")


# === 🤖 POST /mcp/invoke/agent ===
@router.post("/mcp/invoke/agent")
async def mcp_invoke_agent(req: MCPAgentRequest):
    try:
        output = await call_agent(prompt=req.prompt, agent=req.agent)
        return {
            "status": "success",
            "agent": req.agent,
            "tool": "agent",
            "output": output,
        }
    except Exception as e:
        return {"status": "error", "agent": req.agent, "error": str(e)}


# === 🤖 POST /mcp/invoke/agent/stream ===
@router.post("/mcp/invoke/agent/stream")
async def mcp_invoke_agent_stream(req: MCPAgentRequest):
    prompt = req.prompt
    async def stream_gen():
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST", f"{AGENT_API_URL}/chat", json={"message": prompt}
            ) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        yield f'data: {json.dumps({"response": line})}\n\n'

    return EventSourceResponse(stream_gen())


# === 🛑 POST /mcp/invoke/agent/stream/stop ===
@router.post("/mcp/invoke/agent/stream/stop")
async def mcp_invoke_agent_stream_stop(req: MCPAgentRequest):
    return {"status": "success", "message": "Stream stopped"}


# === 📜 GET /mcp/agents ===
@router.get("/mcp/agents")
async def list_agents():
    return {"agents": list(AGENTS.keys())}
