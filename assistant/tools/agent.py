# assistant/tools/agent.py
import os
import json
import httpx

# 🔹 Local LLM (Ollama) defaults
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api/generate")

# 🔹 HexForge Content Engine (your media_api.py on port 8002)
CONTENT_ENGINE_URL = os.getenv("CONTENT_ENGINE_URL", "http://10.0.0.200:8002")

async def call_ollama(prompt: str) -> str:
    """Default text-only assistant using Ollama."""
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                OLLAMA_API_URL,
                json={"model": OLLAMA_MODEL, "prompt": prompt},
            ) as response:
                text_output = ""
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        text_output += data.get("response", "")
                    except json.JSONDecodeError:
                        # ignore malformed lines from ollama
                        continue
        return text_output.strip() or "(no response)"
    except Exception as e:
        return f"(agent error talking to Ollama: {e})"


async def call_content_engine(prompt: str) -> str:
    """
    Send a blog-generation request to the HexForge Content Engine.

    It POSTs JSON to /blog-json on CONTENT_ENGINE_URL.
    """
    payload = {
        "text": prompt,
        "project": "assistant-chat",
        "part": "live",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{CONTENT_ENGINE_URL}/blog-json",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        return (
            "Content Engine error: "
            f"{e.response.status_code} {e.response.text}"
        )
    except Exception as e:
        return f"Content Engine error: {e}"

    # Normalize what comes back from media_api.py
    saved = data.get("saved")
    project = data.get("project")
    part = data.get("part")

    summary = {
        "status": "queued",
        "project": project,
        "part": part,
        "saved": saved,
    }

    # Nice pretty JSON string for the chat UI
    return json.dumps(summary, indent=2)


async def call_agent(prompt: str, agent: str = "default") -> str:
    """
    Dispatch between normal assistant and content-engine agents.
    - agent == "scribe" → HexForge Content Engine (/blog-json)
    - anything else    → local Ollama model
    """
    if agent == "scribe":
        return await call_content_engine(prompt)
    else:
        return await call_ollama(prompt)


AGENTS = {
    "default": "mistral:latest",
    "analysis": "mistral-7b",
    "coding": "codellama:latest",
    "scribe": "content-engine",
}
