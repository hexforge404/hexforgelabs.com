# 🔒 SSL Setup – Cloudflare DNS + Certbot (HexForge Labs)

This document describes the production SSL setup for **hexforgelabs.com**, using:

- Cloudflare DNS API
- Certbot DNS-01 challenge
- Dockerized NGINX
- Renewal-safe symlink strategy

---

## 🧱 Architecture Overview

- **Cloudflare**: DNS provider (API token, DNS:Edit)
- **Certbot**: Issues Let’s Encrypt certificates via DNS-01
- **NGINX (Docker)**: Terminates TLS using symlinked cert paths
- **Domains Covered**:
  - hexforgelabs.com
  - www.hexforgelabs.com
  - tools.hexforgelabs.com

---

## 🔐 Cloudflare API Token

Token scope:
- Zone → DNS → Edit
- Restricted to `hexforgelabs.com`

Stored at:
Permissions:
/root/.secrets/certbot/cloudflare.ini

```bash
chmod 600 /root/.secrets/certbot/cloudflare.ini


📜 Certificate Issuance Command
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 60 \
  -d hexforgelabs.com \
  -d www.hexforgelabs.com \
  -d tools.hexforgelabs.com \
  --agree-tos \
  --email admin@hexforgelabs.com \
  --non-interactive

