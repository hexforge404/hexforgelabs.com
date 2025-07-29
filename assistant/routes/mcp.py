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

class MCPInvokeRequest(BaseModel):
    tool: str
    input: dict = {}

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

class MCPChatRequest(BaseModel):
    prompt: str

@router.post("/mcp/chat")
async def mcp_chat(req: MCPChatRequest):
    from tools.core import save_memory_entry
    prompt = req.prompt.strip()

    try:
        # Dispatch tool commands
        if prompt.startswith("!usb"):
            result = await tool_dispatcher("usb-list", {})
        elif prompt.startswith("!os"):
            result = await tool_dispatcher("os-info", {})
        elif prompt.startswith("!uptime"):
            result = await tool_dispatcher("uptime", {})
        elif prompt.startswith("!df"):
            result = await tool_dispatcher("disk-usage", {})
        elif prompt.startswith("!logs"):
            result = await tool_dispatcher("logs", {})
        elif prompt.startswith("!docker"):
            result = await tool_dispatcher("docker", {})
        elif prompt.startswith("!ping"):
            target = prompt.split(" ", 1)[1] if " " in prompt else "8.8.8.8"
            result = await tool_dispatcher("ping", {"target": target})
        else:
            # LLM agent fallback
            result = await tool_dispatcher("agent", {"prompt": prompt})

        if not prompt.startswith("!"):
            await save_memory_entry("agent", prompt, result)

        return JSONResponse(content={
            "status": "success",
            "tool": prompt,
            "output": result
        })

    except Exception as e:
        return JSONResponse(content={
            "status": "error",
            "tool": prompt,
            "output": f"(error) {str(e)}"
        }, status_code=500)

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

class MCPAgentRequest(BaseModel):
    agent: str
    prompt: str

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

@router.post("/mcp/invoke/agent/stream/stop")
async def mcp_invoke_agent_stream_stop(req: MCPAgentRequest):
    return {"status": "success", "message": "Stream stopped"}

@router.get("/mcp/agents")
async def list_agents():
    from tools.agent import AGENTS
    return {"agents": list(AGENTS.keys())}
