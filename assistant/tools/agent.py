# assistant/tools/agent.py
import httpx
import os
import json

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api/generate")

async def call_agent(prompt: str, agent: str = "default"):
    """Call Ollama stream endpoint and merge all token responses."""
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
                        continue
                return text_output.strip() or "(no response)"
    except Exception as e:
        return f"(agent error: {e})"
