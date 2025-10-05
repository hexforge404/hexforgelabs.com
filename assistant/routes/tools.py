# assistant/routes/tools.py
from fastapi import APIRouter, Body
from assistant.tools.system import ping_host

router = APIRouter()

@router.post("/tool/ping")
async def tool_ping(target: str = Body(default="8.8.8.8")):
    """
    POST /tool/ping
    Body: { "target": "8.8.8.8" }
    """
    return await ping_host(target)
