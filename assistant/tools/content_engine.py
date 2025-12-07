# assistant/tools/content_engine.py
import os
import httpx

CONTENT_ENGINE_URL = os.getenv("CONTENT_ENGINE_URL", "http://10.0.0.200:8002")

async def send_blog_json(text: str,
                         project: str = "assistant-chat",
                         part: str = "live"):
    """
    Send a blog-draft payload to the HexForge Content Engine.

    Returns the parsed JSON response from /blog-json, e.g.
    {
      "status": "ok",
      "saved": "...path...",
      "project": "...",
      "part": "..."
    }
    """
    payload = {
        "text": text,
        "project": project,
        "part": part,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(f"{CONTENT_ENGINE_URL}/blog-json", json=payload)
        r.raise_for_status()
        return r.json()
