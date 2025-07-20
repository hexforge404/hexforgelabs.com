from fastapi import APIRouter
from pydantic import BaseModel
from tools.dispatcher import tool_dispatcher  
from starlette.responses import StreamingResponse
import httpx
import os
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")


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
    prompt = req.prompt.strip()

    # You can expand these as needed
    if prompt.startswith("!usb"):
        return await mcp_invoke(MCPInvokeRequest(tool="usb-list", input={}))
    elif prompt.startswith("!os"):
        return await mcp_invoke(MCPInvokeRequest(tool="os-info", input={}))

    # 🔄 Fallback to AI agent
    result = await tool_dispatcher("agent", {"prompt": prompt})
    return {
        "status": "success",
        "tool": "agent",
        "output": result
    }

@router.post("/mcp/stream")
async def mcp_stream(req: MCPChatRequest):
    from tools.core import save_memory_entry
    prompt = req.prompt
    full_output = ""

    async def stream_gen():
        nonlocal full_output
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", "http://ollama:11434/api/generate", json={"model": OLLAMA_MODEL, "prompt": prompt}) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        full_output += line + "\n"
                        yield line + "\n"  # raw stream line

    async def generator_with_memory():
        async for line in stream_gen():
            yield line
        await save_memory_entry("agent", {
            "prompt": prompt,
            "response": full_output
        })

    return StreamingResponse(generator_with_memory(), media_type="text/plain")


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
    from tools.agent import call_agent
    prompt = req.prompt
    agent = req.agent

    async def stream_gen():
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"https://{agent}.hexforgelabs.com/chat", json={"message": prompt}) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        yield {"event": "message", "data": line}

    return EventSourceResponse(stream_gen())
@router.post("/mcp/invoke/agent/stream/stop")
async def mcp_invoke_agent_stream_stop(req: MCPAgentRequest):
    # This is a placeholder for stopping the stream
    # In a real-world scenario, you would implement logic to stop the stream
    return {
        "status": "success",
        "message": "Stream stopped"
    }

@router.get("/mcp/agents")
async def list_agents():
    from tools.agent import AGENTS
    return {"agents": list(AGENTS.keys())}
