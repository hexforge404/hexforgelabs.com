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

Commands executed (paste into docs)
# Fix Cloudflare credentials perms (required by certbot)
chmod 600 /root/.secrets/certbot/cloudflare.ini

# Issue/confirm certs (dns-cloudflare) + propagation wait
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

# Verify NGINX is using expected cert paths
docker exec -it hexforge-nginx nginx -T | grep -n "ssl_certificate"

# Verify live cert dates (public)
echo | openssl s_client -connect hexforgelabs.com:443 -servername hexforgelabs.com 2>/dev/null | openssl x509 -noout -dates

# Remove stale renewal config (the one breaking renew)
ls -l /etc/letsencrypt/renewal/
sudo rm /etc/letsencrypt/renewal/hexforgelabs.com.conf

# Confirm renewal works
certbot renew --dry-run

Key files

/root/.secrets/certbot/cloudflare.ini (permissions must be 600)

Active renewal config: /etc/letsencrypt/renewal/hexforgelabs.com-0001.conf

Stale/bad config removed: /etc/letsencrypt/renewal/hexforgelabs.com.conf

NGINX SSL paths used:

/etc/letsencrypt/live/hexforgelabs.com/fullchain.pem

/etc/letsencrypt/live/hexforgelabs.com/privkey.pem