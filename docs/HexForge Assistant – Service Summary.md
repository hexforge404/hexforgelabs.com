# 🧠 HexForge Assistant – Service Summary

*Last updated: July 18, 2025*

---

## 🧩 Assistant Overview

The HexForge Lab Assistant is a full-featured backend assistant service using **FastAPI** and **Node.js**, connected to frontend pages `/chat`, `/assistant`, and `/editor`. The system integrates modular tools, memory logging, and LLM routing via Ollama.

---

## 🧰 Tool Inventory (FastAPI)

| Tool Endpoint | Route | Purpose |
| --- | --- | --- |
| `os-info` | `/tool/os-info` | System OS information |
| `usb-list` | `/tool/usb-list` | List connected USB devices |
| `logs` | `/tool/logs` | System log files |
| `ping` | `/tool/ping` (POST) | Ping host + latency |
| `uptime` | `/tool/uptime` | Show uptime |
| `df` | `/tool/df` | Disk usage summary |
| `docker` | `/tool/docker` | Running docker containers |
| `firefox` | `/tool/firefox` | Launch Firefox |
| `freecad` | `/tool/freecad` | Launch FreeCAD |
| `blender` | `/tool/blender` | Launch Blender |
| `inkscape` | `/tool/inkscape` | Launch Inkscape |
| `gimp` | `/tool/gimp` | Launch GIMP |
| `fritzing` | `/tool/fritzing` | Launch Fritzing |
| `kicad` | `/tool/kicad` | Launch KiCad |
| `btop` | `/tool/btop` | Run btop monitor |
| `neofetch` | `/tool/neofetch` | System summary UI |
| `status` | `/tool/status` | Installed tool check |
| `whoami` | `/tool/whoami` | Get current user |
| `open` | `/tool/open?file_path=` | Open file path |
| `ollama` | `/tool/ollama` | List local LLM models |
| `memory` | `/tool/memory` | Recent memory logs |
| `debug` | `/tool/debug` | Hostname, IPs, OS, user info |
| `list` | `/tool/list` | All registered tools |

---

## 🧬 Core Files & Modules

| File / Module | Location | Role |
| --- | --- | --- |
| `main.py` | `/assistant` | FastAPI entrypoint and tool registration |
| `tool_registry.py` | `/assistant` | Registers tools into shared dict with decorators |
| `tools.py` | `/assistant` | Implements each tool function |
| `ai_proxy.py` | `/assistant` | Sends prompt to Ollama LLM backend |
| `dispatcher.py` | `/assistant/routes/` | 🔥 Handles `/msg/chat` → ⚠️ suspected 502 source |
| `mcp.py` | `/assistant/routes/` | Assistant controller endpoint routing |
| `notion.py` | `/assistant/routes/` | Notion API handler for data sync |
| `toolbase.py` | `/assistant` | Tool base class used for modular extension |

---

## 🖥️ Node Backend Routes (Connected)

| Route Prefix | Purpose |
| --- | --- |
| `/api/memory` | Save/search/delete memory entries |
| `/api/tools` | Proxy backend for assistant tools |
| `/api/blog` | Blog routes + editor saving |
| `/api/mcp` | Backend controller for assistant |
| `/api/notion` | 🔗 Integration for Notion sync |
| `/api/editor` | Monaco-based blog editor UI |

---

## 🌐 Frontend Pages

| Path | Component/Page | Notes |
| --- | --- | --- |
| `/chat` | `ChatPage.jsx` | Loads assistant drawer; uses `/msg/chat` |
| `/assistant` | `AssistantPage.jsx` | Full interface with tools, history, models |
| `/editor` | `MonacoEditorPage.jsx` | Markdown blog editor w/ AI and save functionality |
| `App.jsx` | Core router | Defines all pages and auth gate |

---

## 🔥 Outstanding Issues

- `dispatcher.py` 502 error causes assistant stream to fail
- Frontend buttons load but tool responses may not render
- `list_open_ports`, `get_ip_addresses` available but not exposed in UI
- No current model selector or status in assistant UI

---

## 🧠 Memory System

- Uses `!memory`, `!memory search`, `!memory delete` etc.
- Connects to `/api/memory/` endpoints via FastAPI or Node
- Memory is auto-saved per tool execution (stored in MongoDB)

---

## 🔌 MCP & Notion Integration

- `/api/mcp` and `mcp.py` coordinate requests across backend services
- Frontend and FastAPI assistant call MCP endpoints directly
- `/api/notion` connects to Notion API to sync memory, blog, and config
- Notion sync supports project dashboarding, memory export, and live summaries

---

## 🧠 AI Sandbox VMs (Proxmox)

### 🐧 Linux AI Sandbox (Wired In)

- **Status:** Fully operational and wired into assistant toolchain
- **Hostname:** `hex-sandbox`
- **Features:** OBS, CLI Logger, Ollama, FastAPI tools, ComfyUI, SadTalker, Wav2Lip
- **Connected:** Memory logging + assistant API fully functional

### 🪟 Windows AI Sandbox (Wiring In Progress)

- **Status:** Running and reachable via RustDesk
- **Features:** OBS, HexForgeRunner, CLI logger, asset bundling, content pipeline launcher
- **Todo:** Finalize assistant integration, validate logging + API access

Both VMs are hosted on the HexForge Proxmox node with dedicated IPs and shared CIFS mount access.

---

## 🧠 Content Automation Pipeline

- Referenced via toolchain integration
- Will be documented separately under **Dev Page: Content Pipeline Overview**
- Supports logging, blog generation, asset bundling, TTS and image generation
- Windows and Linux sandbox tools feed into this pipeline

---

## 🔜 Next Steps

- [ ]  Fix `dispatcher.py` or wrap 502 stream errors
- [ ]  Add frontend model selector + tool usage feedback
- [ ]  Create `/assistant/tools/` UI to list and run all tools
- [ ]  Restore full Ollama fallback handling (offline/degraded mode)
- [ ]  Add diagnostics page for Redis, MongoDB, LLM status
- [ ]  Link blog post export to `/api/blog` or editor directly