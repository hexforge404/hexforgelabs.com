from datetime import datetime
import requests
import json
import uuid
import os
import asyncio

# ✅ ASYNC future-proofed memory entry
async def save_memory_entry(name, result, extra_tags=None, quiet=False):
    # 👇 sync function defined inside for thread offloading
    def sync_work():
        tags = ["tool"]
        category = "general"

        if name in ["os-info", "whoami"]:
            category = "system"
        elif name in ["usb-list", "ping"]:
            category = "network"
        elif "launched" in str(result).lower():
            category = "tool-launch"
        elif "Opened" in str(result) or name == "open-file":
            category = "file"
        elif name == "check-tools":
            category = "status"

        if isinstance(result, dict) and "error" in result:
            tags.append("error")

        if extra_tags:
            tags.extend(extra_tags)

        entry = {
            "id": str(uuid.uuid4()),
            "name": name,
            "description": f"Tool: {name}",
            "type": "tool",
            "category": category,
            "tags": list(set(tags)),
            "user": "assistant",
            "timestamp": datetime.utcnow().isoformat(),
            "tool": name,
            "result": result
        }

        try:
            requests.post(
                "http://hexforge-backend:8000/api/memory/",
                json=entry,
                timeout=3
            )
            if not quiet:
                print(f"[✔] Memory saved for: {name}")
        except Exception as e:
            fallback_path = "/tmp/hexforge_memory_log.jsonl"
            try:
                with open(fallback_path, "a") as f:
                    f.write(json.dumps({
                        "name": name,
                        "error": str(e),
                        "result": result,
                        "timestamp": datetime.utcnow().isoformat()
                    }) + "\n")
                if not quiet:
                    print(f"[!] Memory fallback to: {fallback_path}")
            except Exception as write_fail:
                if not quiet:
                    print(f"[x] Failed to save memory: {write_fail}")

    # 🧠 Run in thread to avoid blocking async event loop
    await asyncio.to_thread(sync_work)
