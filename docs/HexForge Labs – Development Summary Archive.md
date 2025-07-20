# 📊 HexForge Labs – Development Summary (Post-HTTPS Fix)

**📁 Proxmox Store Directory:**

`/mnt/hdd-storage/hexforge-store/`

**📁 Certbot SSL Certs:**

`/etc/letsencrypt/live/hexforgelabs.com/`

---

## ✅ Deployment Status (as of 2025-05-01)

- ✅ Dockerized stack (Mongo, Backend, Frontend, NGINX)
- ✅ Certbot TLS/SSL HTTPS working with Cloudflare Full Strict
- ✅ Cloudflare orange cloud (proxy) re-enabled after HTTPS fixed
- ✅ Site loads externally without incognito or cache bypass
- ✅ Cart, orders, checkout, and email all work

---

## 🔧 Recent Fixes & Lessons

| Issue | Fix |
| --- | --- |
| ❌ Error 521 via Cloudflare | ✅ Installed Certbot, issued certs, updated NGINX |
| ❌ NGINX config not updating | ✅ Confirmed VS Code edits not applying, fixed via Nano |
| ❌ HTTP redirect loop | ✅ Separate HTTP/HTTPS blocks; added Certbot defaults |
| ❌ Images not loading | ✅ Mounted `frontend/build` & `/images` to NGINX correctly |

---

## 🌐 Public Access

- 🔗 **Website:** [https://hexforgelabs.com](https://hexforgelabs.com/)
- 🔐 **TLS Status:** Full HTTPS with Let's Encrypt
- 🔗 **Backend API:** https://hexforgelabs.com/api

---

| Command | Action |
| --- | --- |
| `hexstart` | Start the HexForge service |
| `hexstop` | Stop it |
| `hexrestart` | Restart it |
| `hexstatus` | View current status |
| `hexlog` | Live logs from the service |

## 🧰 Core Docker Commands

```bash
bash
CopyEdit
# Build and start everything fresh
docker compose up --build -d

# Shut down and clear volumes
docker compose down -v

# View logs
docker logs hexforge-backend
docker logs hexforge-nginx
docker logs hexforge-mongo

# Shell access
docker exec -it hexforge-backend sh
docker exec -it hexforge-nginx sh
docker exec -it hexforge-mongo mongosh

# Reissue HTTPS certs (stop NGINX first)
docker stop hexforge-nginx
sudo certbot certonly --standalone -d hexforgelabs.com -d www.hexforgelabs.com
docker start hexforge-nginx

```

---

## 🔒 SSL Certificate Paths (Mounted into NGINX)

```
nginx
CopyEdit
ssl_certificate     /etc/letsencrypt/live/hexforgelabs.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/hexforgelabs.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/hexforgelabs.com/chain.pem;

```

---

## 🔁 NGINX Config Notes

- HTTP block **redirects** to HTTPS (port 80)
- HTTPS block **serves React app**, proxies `/api/` to backend
- Config is at:
    
    `./nginx/default.conf` (on host)
    
    → mapped to `/etc/nginx/conf.d/default.conf` inside container
    

## 🧠 Editor Integration + Assistant Panel (as of 2025-05-13)

### ✅ Core Features Now Live

| Feature | Status |
| --- | --- |
| 🧾 File listing from backend | ✅ Working |
| 📂 File open/save via `/api/editor/open` + `/save` | ✅ Working |
| 📜 Monaco Editor live rendering | ✅ Working |
| ⚙️ Code execution via `/api/editor/execute` | ✅ Working |
| 🧠 AI terminal prompt via `/chat` | ✅ Working |
| 🖥️ Shell mode via `/api/editor/terminal` | ✅ Working |
| 📋 Right sidebar shows filename, mode, status | ✅ Working |
| 🧪 Tabs for toggling `Files` ↔ `Terminal` and `Info` ↔ `Details` | ✅ Working |

---

### 🛠️ In Progress

| Issue | Next Action |
| --- | --- |
| ⚠️ Terminal & sidebars not displaying | 🔧 Wrap `return (...)` in a top-level `<div>` with `className="monaco-wrapper"` to fix layout |
| ⚠️ Layout collapsing | 🔧 Ensure no JSX root is prematurely closed before `return` body renders |
| 🧹 Extra state hooks removed | ✅ Reduced clutter from unused vars like `newFileName`, `renameFileName`, `aiMessage` |

---

### 🧭 Updated Dev Flow

```bash
bash
CopyEdit
# On file load:
POST /api/editor/open     → loads file content into Monaco

# On save:
POST /api/editor/save     → pushes edits back to disk

# On shell/AI Run:
POST /chat                → AI response
POST /api/editor/terminal → Shell command output

# On Run Code:
POST /api/editor/execute  → Captures & returns execution result

```