from datetime import datetime
import requests
import json
import uuid
import os
import asyncio

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://hexforge-backend:8000")



# ✅ ASYNC future-proofed memory entry
async def save_memory_entry(name, result, extra_tags=None, quiet=False):
    """
    - Logs to backend memory API:  POST /api/memory/
    - Also mirrors into Notion via: POST /api/notion/memory-upsert
    - Runs all network I/O in a thread so it never blocks the event loop.
    """

    def sync_work():
        tags = ["tool"]
        category = "general"

        # Auto-categorize
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

        timestamp = datetime.utcnow().isoformat()

        # Full entry for backend memory DB
        entry = {
            "id": str(uuid.uuid4()),
            "name": name,
            "description": f"Tool: {name}",
            "type": "tool",
            "category": category,
            "tags": list(set(tags)),
            "user": "assistant",
            "timestamp": timestamp,
            "tool": name,
            "result": result,
        }

        # --- 1) Primary: backend memory API ---
        try:
            requests.post(
                f"{BACKEND_BASE_URL.rstrip('/')}/api/memory/",
                json=entry,
                timeout=3,
            )
            if not quiet:
                print(f"[✔] Memory saved for: {name}")
        except Exception as e:
            # Fallback to local JSONL file if backend is down
            fallback_path = "/tmp/hexforge_memory_log.jsonl"
            try:
                with open(fallback_path, "a") as f:
                    f.write(
                        json.dumps(
                            {
                                "name": name,
                                "error": str(e),
                                "result": result,
                                "timestamp": datetime.utcnow().isoformat(),
                            }
                        )
                        + "\n"
                    )
                if not quiet:
                    print(f"[!] Memory fallback to: {fallback_path}")
            except Exception as write_fail:
                if not quiet:
                    print(f"[x] Failed to save memory: {write_fail}")

        # --- 2) Mirror into Notion (assistant_log DB) ---
        # This hits the backend helper which talks to Notion via the official SDK.
        try:
            notion_entry = {
                "tool": name,
                "timestamp": timestamp,
                "result": result,
                "id": entry["id"],  # optional; upsert logic matches on 'tool'
            }

            requests.post(
                f"{BACKEND_BASE_URL.rstrip('/')}/api/notion/memory-upsert",
                json={"entry": notion_entry, "target": "assistant_log"},
                timeout=5,
            )
            if not quiet:
                print(f"[🧠 Notion] Synced memory for: {name}")
        except Exception as e:
            if not quiet:
                print(f"[⚠] Notion sync failed for {name}: {e}")

    # 🧠 Run in thread to avoid blocking async event loop
    await asyncio.to_thread(sync_work)
