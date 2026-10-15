# Production Proxy-Trust Hardening Runbook

**System:** HexForge Labs production website
**Repository:** `/mnt/hdd-storage/hexforge-store`
**Deployment date:** October 14, 2026
**Security commit:** `5534465`
**Deployment status:** Verified operational
**Remote Git status at verification:** Local `main` ahead of `origin/main` by one commit

## 1. Purpose

Restrict Express's reverse-proxy trust configuration to the designated production Nginx container.

The previous implementation broadly trusted loopback addresses, private address ranges, and IPv4-mapped IPv6 addresses.

The hardened implementation trusts only the configured Nginx proxy address, reducing the risk of unauthorized forwarding headers influencing request IP attribution.

## 2. Production Architecture

A dedicated Docker bridge network separates the trusted Nginx-to-backend communication path from the existing shared application network.

| Component | Dedicated network address |
|---|---|
| Nginx reverse proxy | `172.30.250.10` |
| Express backend | `172.30.250.20` |
| Network | `172.30.250.0/24` |
| Docker network name | `hexforge-store_hexforge-proxy-network` |
| Backend DNS alias | `backend-proxy` |

Both containers retain their existing shared-network attachments.

The backend continues to have no published host ports.

## 3. Security Configuration

The backend reads `TRUSTED_PROXY_IP` from its environment.

Production value:

`TRUSTED_PROXY_IP=172.30.250.10`

The security policy is implemented in `backend/security/trustedProxy.js` and configured in `backend/main.js`.

The policy:

- Accepts the configured trusted proxy IP.
- Accepts its equivalent IPv4-mapped IPv6 representation.
- Rejects other Docker container addresses.
- Rejects arbitrary external addresses.
- Rejects malformed addresses.
- Fails closed when the trusted address is missing or invalid.

Nginx uses the `backend-proxy` alias for the six updated backend proxy routes.

## 4. Changed Files

The security deployment was committed locally as `5534465`.

The commit contains exactly these five files:

1. `backend/main.js`
2. `backend/security/trustedProxy.js`
3. `backend/tests/proxyTrust.test.js`
4. `docker-compose.yml`
5. `nginx/default.conf`

Six unrelated, untracked evidence paths were excluded from the commit and must remain protected from unrelated repository operations.

## 5. Verification Results

### Automated Security Tests

Twelve Jest/Supertest tests passed.

Coverage includes trusted-address validation, malformed-address rejection, forwarded-protocol handling, forwarded-client-IP handling, and fail-closed behavior.

### Live Production Tests

**Untrusted connection:** A request sent directly to the backend with a spoofed `X-Forwarded-For` header was recorded as originating from loopback, not the spoofed address.

**Trusted Nginx connection:** A request routed through Nginx returned HTTP 200. Express recorded the actual client address observed by Nginx rather than the spoofed forwarding-header address.

These checks validate the tested internal proxy-trust boundary. They do not independently establish correct public-client IP attribution through Cloudflare.

### Production Health

The final production health script passed all seven checks:

- Backend container healthy.
- Nginx container healthy.
- Backend health endpoint healthy and MongoDB connected.
- Public homepage returned HTTP 200.
- Products API returned HTTP 200.
- Admin page returned HTTP 200.
- Backend had no published host ports.

Nginx configuration syntax validation also passed.

## 6. Routine Operational Verification

From the repository directory:

```bash
cd /mnt/hdd-storage/hexforge-store

bash scripts/health-check-production.sh

docker exec hexforge-nginx nginx -t

docker ps \
  --filter name=hexforge-backend \
  --filter name=hexforge-nginx \
  --format 'table {{.Names}}\t{{.Status}}'
```

To verify the trusted proxy address without printing other environment variables:

```bash
docker exec hexforge-backend sh -c '
  test "$TRUSTED_PROXY_IP" = "172.30.250.10"
'
```

To run the security tests:

```bash
docker exec hexforge-backend sh -c '
  cd /app
  NODE_ENV=test ./node_modules/.bin/jest \
    --runInBand tests/proxyTrust.test.js
'
```

## 7. Rollback and Recovery

Verified rollback backup:

`/mnt/hexforge-backup/lab-critical-backups/proxy-trust-hardening-20261014T230503Z`

The backup contains:

- `main.js.before`
- `docker-compose.yml.before`
- `nginx-default.conf.before`
- `SHA256SUMS`

All three original files passed SHA-256 verification during the final documentation preparation.

**Rollback requires explicit operator authorization.**

If rollback is approved:

1. Confirm the incident and record current production health.
2. Verify the backup checksums again.
3. Restore the original three files to their respective repository paths.
4. Validate the restored Docker Compose and Nginx configurations.
5. Recreate only the affected backend and Nginx services using the approved recovery procedure.
6. Verify backend/database health, public HTTPS endpoints, and service connectivity.
7. Remove the dedicated proxy network only after confirming it is no longer required or attached.
8. Record the rollback result and reconcile the repository state.

**Security warning:** The original configuration used broader proxy-trust rules. Rolling back restores that earlier security behavior. Prefer correcting the hardened configuration when feasible.

Do not run `docker compose down -v` as part of this recovery.

## 8. Remaining Considerations

- Audit Cloudflare-to-Nginx public-client IP attribution separately.
- Keep the dedicated proxy network addresses consistent with the Express trust configuration.
- Revalidate proxy-trust behavior whenever Nginx routing, Docker networking, or forwarding-header handling changes.
- Push local Git changes only with separate authorization.
- Preserve the verified rollback backup until the change is formally retired.

## 9. Completion Record

**Deployment:** Complete
**Production health:** Passed
**Automated security tests:** 12/12 passed
**Live proxy-trust verification:** Passed
**Local Git commit:** `5534465`
**Remote push:** Not performed at the time of verification
**Rollback backup:** Verified and retained

The deployment was verified operational before documentation preparation.
