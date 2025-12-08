# assistant/tools/notion_inventory.py
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx

from ..tool_registry import register_tool


def _backend_base() -> str:
    """
    Base URL for the Node backend. We default to the internal Docker
    hostname used in docker-compose.
    """
    return os.getenv("BACKEND_URL", "http://hexforge-backend:8000").rstrip("/")


def _backend_url(path: str) -> str:
    return f"{_backend_base()}{path}"


def _extract_text(prop: Dict[str, Any]) -> str:
    """
    Safely unwrap a Notion title/rich_text property into plain text.
    """
    if not prop:
        return ""

    # Handle both title + rich_text, just in case
    blocks = []
    if "title" in prop:
        blocks = prop.get("title") or []
    elif "rich_text" in prop:
        blocks = prop.get("rich_text") or []

    return "".join(t.get("plain_text", "") for t in blocks)


def _extract_number(prop: Dict[str, Any]) -> Optional[float]:
    if not prop:
        return None
    return prop.get("number")


@register_tool(
    "notion_inventory_list",
    "List inventory items from Notion via the backend.",
    category="Notion",
    method="GET",
)
async def notion_inventory_list(query: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch inventory rows from the backend /api/notion/inventory endpoint
    and normalize them into a simple list of dicts.

    Args:
        query: optional case-insensitive substring filter on the item name.
    """
    url = _backend_url("/api/notion/inventory")

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    results: List[Dict[str, Any]] = []

    for page in data.get("results", []):
        props = page.get("properties", {})

        item = {
            "page_id": page.get("id"),
            "name": _extract_text(props.get("Item") or props.get("Name")),
            "category": _extract_text(props.get("Category")),
            "used_in": _extract_text(props.get("Used In")),
            "location": _extract_text(props.get("Location")),
            "notes": _extract_text(props.get("Notes")),
            "quantity": _extract_number(props.get("Quantity")),
            "price_each": _extract_number(
                props.get("Price per piece") or props.get("Price/Ea")
            ),
        }

        results.append(item)

    # Optional name filter
    if query:
        q = query.lower()
        results = [
            r for r in results if q in (r.get("name") or "").lower()
        ]

    return {
        "ok": True,
        "count": len(results),
        "entries": results,
    }
