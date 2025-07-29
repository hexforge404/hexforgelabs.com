from fastapi import APIRouter
from pydantic import BaseModel
from tools.dispatcher import tool_dispatcher  
from sse_starlette.sse import EventSourceResponse
from starlette.responses import StreamingResponse
from fastapi.responses import JSONResponse
import httpx
import json
import os

# Optional model name for Ollama agent fallback
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
AGENT_API_URL = os.getenv("AGENT_API_URL", "https://agent.hexforgelabs.com")

router = APIRouter()

# === 🧠 Chat tool aliases ===
command_aliases = {
    "usb": "usb-list",
    "os": "os-info",
    "logs": "logs",
    "df": "disk-usage",
    "uptime": "uptime",
    "docker": "docker",
    "user": "user",
    "ping": "ping",  # ping still needs special handling
}

# === 📦 Request models ===
class MCPInvokeRequest(BaseModel):
    tool: str
    input: dict = {}

class MCPChatRequest(BaseModel):
    prompt: str

class MCPAgentRequest(BaseModel):
    agent: str
    prompt: str

# === 📡 POST /mcp/invoke ===
@router.post("/mcp/invoke")
async def mcp_invoke(request: MCPInvokeRequest):
    try:
        result = await tool_dispatcher(request.tool, request.input)
        return {
            "status": "success",
            "tool": request.tool,
            "output": result
        }
    except Exception as e:
        return {
            "status": "error",
            "tool": request.tool,
            "error": str(e)
        }

# === 💬 POST /mcp/chat ===
@router.post("/mcp/chat")
async def mcp_chat(req: MCPChatRequest):
    from tools.core import save_memory_entry
    prompt = req.prompt.strip()

    try:
        result = None

        if prompt.startswith("!"):
            cmd = prompt[1:].split(" ")[0]
            arg = prompt[len(cmd)+2:].strip()  # after !cmd and space

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

        return JSONResponse(content={
            "status": "success",
            "tool": cmd if prompt.startswith("!") else "agent",
            "output": result
        })

    except Exception as e:
        return JSONResponse(content={
            "status": "error",
            "tool": prompt,
            "output": f"(error) {str(e)}"
        }, status_code=500)

# === 🧠 POST /mcp/stream ===
@router.post("/mcp/stream")
async def mcp_stream(req: MCPChatRequest):
    from tools.core import save_memory_entry
    prompt = req.prompt
    full_output = ""

    async def stream_gen():
        nonlocal full_output
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"http://ollama:11434/api/generate", json={"model": OLLAMA_MODEL, "prompt": prompt}) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        full_output += line + "\n"
                        yield f"event: message\ndata: {line}\n\n"

    async def generator_with_memory():
        async for line in stream_gen():
            yield line
        await save_memory_entry("agent", {
            "prompt": prompt,
            "response": full_output
        })

    return StreamingResponse(generator_with_memory(), media_type="text/event-stream")

# === 🤖 POST /mcp/invoke/agent ===
@router.post("/mcp/invoke/agent")
async def mcp_invoke_agent(req: MCPAgentRequest):
    from tools.agent import call_agent
    try:
        output = await call_agent(prompt=req.prompt, agent=req.agent)
        return {
            "status": "success",
            "agent": req.agent,
            "tool": "agent",
            "output": output
        }
    except Exception as e:
        return {
            "status": "error",
            "agent": req.agent,
            "error": str(e)
        }

# === 🤖 POST /mcp/invoke/agent/stream ===
@router.post("/mcp/invoke/agent/stream")
async def mcp_invoke_agent_stream(req: MCPAgentRequest):
    prompt = req.prompt
    agent = req.agent

    async def stream_gen():
        full_output = ""
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{AGENT_API_URL}/chat", json={"message": prompt}) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        full_output += line + "\n"
                        yield f'data: {json.dumps({"response": line})}\n\n'

    return EventSourceResponse(stream_gen())

# === 🛑 POST /mcp/invoke/agent/stream/stop ===
@router.post("/mcp/invoke/agent/stream/stop")
async def mcp_invoke_agent_stream_stop(req: MCPAgentRequest):
    return {"status": "success", "message": "Stream stopped"}

# === 📜 GET /mcp/agents ===
@router.get("/mcp/agents")
async def list_agents():
    from tools.agent import AGENTS
    return {"agents": list(AGENTS.keys())}
