# assistant/tools/agent.py
import httpx

AGENTS = {
    "default": "https://assistant.hexforgelabs.com/chat",
    "creative": "https://creative.hexforgelabs.com/chat",
    "dev": "https://dev.hexforgelabs.com/chat"
}


# Direct subdomain route to self
ASSISTANT_URL = "https://assistant.hexforgelabs.com"

async def call_agent(prompt: str, agent: str = "default"):
    url = AGENTS.get(agent, AGENTS["default"])
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json={"message": prompt}, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result.get("response", result)
