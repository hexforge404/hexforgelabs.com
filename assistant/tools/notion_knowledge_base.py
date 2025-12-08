# assistant/tools/notion_knowledge_base.py
from __future__ import annotations

from typing import List, Optional
import os

import httpx

from ..tool_registry import register_tool


# -------------------------------------------------------------------
# Helper: build backend URL
# -------------------------------------------------------------------

BACKEND_BASE = os.getenv("BACKEND_BASE_URL", "http://hexforge-backend:8000")


def _backend_url(path: str) -> str:
    if not path.startswith("/"):
        path = "/" + path
    return f"{BACKEND_BASE}{path}"


# -------------------------------------------------------------------
# 🧠 List knowledge-base entries from Notion
# -------------------------------------------------------------------

@register_tool(
    "list_knowledge_entries",
    "List knowledge-base entries from Notion",
    category="Notion",
    method="GET",
)
def list_knowledge_entries(query: Optional[str] = None):
    """
    Fetch knowledge-base entries from the backend /api/notion/knowledge-base.

    Currently the backend just returns the raw Notion DB query result.
    If `query` is provided, we do a simple client-side filter on title/body.
    """
    url = _backend_url("/api/notion/knowledge-base")

    try:
        resp = httpx.get(url, timeout=20)
        resp.raise_for_status()
    except Exception as exc:
        return {"ok": False, "error": f"Failed to fetch KB entries: {exc}"}

    data = resp.json()

    # Notion DB query style: { results: [...] }
    results = data.get("results", [])

    entries = []
    for page in results:
        props = page.get("properties", {})

        # Title
        title_prop = props.get("Name", {})
        title_fragments = title_prop.get("title", [])
        title = "".join(
            frag.get("plain_text")
            or frag.get("text", {}).get("content", "")
            for frag in title_fragments
        ) or "(untitled)"

        # Content (short body)
        content_prop = props.get("Content", {})
        content_fragments = content_prop.get("rich_text", [])
        body = "".join(
            frag.get("plain_text")
            or frag.get("text", {}).get("content", "")
            for frag in content_fragments
        )

        # Tags
        tags_prop = props.get("Tags", {})
        tags = [
            t.get("name")
            for t in tags_prop.get("multi_select", [])
            if t.get("name")
        ]

        entries.append(
            {
                "id": page.get("id"),
                "title": title,
                "body": body,
                "tags": tags,
                "url": page.get("url"),
            }
        )

    # Optional client-side search
    if query:
        q = query.lower()
        entries = [
            e
            for e in entries
            if q in e["title"].lower() or q in (e["body"] or "").lower()
        ]

    return {"ok": True, "count": len(entries), "entries": entries}


# -------------------------------------------------------------------
# 🧠 Create a new knowledge-base entry
# -------------------------------------------------------------------

@register_tool(
    "create_knowledge_entry",
    "Create a Notion knowledge-base entry",
    category="Notion",
    method="POST",
)
def create_knowledge_entry(
    title: str,
    body: str,
    tags: Optional[List[str]] = None,
):
    """
    Ask the backend to create a KB entry via /api/notion/knowledge-entry.
    The backend uses Notion to actually create the page.
    """
    url = _backend_url("/api/notion/knowledge-entry")
    payload = {"title": title, "body": body, "tags": tags or []}

    try:
        resp = httpx.post(url, json=payload, timeout=20)
        resp.raise_for_status()
    except Exception as exc:
        return {"ok": False, "error": f"Failed to create KB entry: {exc}"}

    return {"ok": True, "title": title}
