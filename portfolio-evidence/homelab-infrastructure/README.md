# HexForge Labs Homelab / Production Infrastructure — Proof of Work

This package documents the operation, recovery, verification, and protection of
a self-hosted HexForge Labs production environment. Evidence was collected from
the current Proxmox/Docker host, committed infrastructure definitions, public
production routes, an existing September 2026 backup set, and a historical July
2026 recovery record.

## Scope

The demonstrated environment uses a Proxmox VE host running Debian Linux and
Docker / Docker Compose. The main production path places Nginx in front of a
React frontend, Express APIs, MongoDB, assistant/model services, and dedicated
heightmap and surface tools. Adjacent self-hosted services provide collaboration,
monitoring, and administration through Nextcloud, MariaDB, OnlyOffice, Uptime
Kuma, Portainer, and File Browser.

The host is an HP Z840 workstation with dual Xeon processors, 16 physical cores
/ 32 logical CPUs, approximately 62 GiB RAM, dedicated application storage, and
dedicated backup storage. Hardware is context, not the central accomplishment;
the case study focuses on operational design and evidence-backed discipline.

## Architecture and operations

The source and runtime evidence supports:

- Docker Compose orchestration on an internal service network
- Nginx TLS termination, static frontend delivery, and reverse proxy routing
- Separation of frontend, backend, database, model, and production-tool services
- Persistent application and database storage
- Explicit health checks for core services
- Separately defined services and point-in-time production verification
- Privacy boundaries between public assets and private customer intake
- A self-hosted collaboration and operations layer

The architecture diagram is intentionally functional rather than topological.
It omits addresses, ports, bridge names, mount paths, and management endpoints.

## Recovery and stabilization story

Historical July 2026 records show a deliberate recovery workflow: assess the
service state, stabilize dependencies, classify ambiguous resources, protect
persistent data, verify health and backups, and only then consider cleanup.
Monitoring, administration, file-management, collaboration, and core HexForge
services were recovered or confirmed. Destructive cleanup was deferred while
stopped services and protected storage were classified.

## Backup and integrity story

The approved September 2026 backup set contains five unique artifacts covering
Nextcloud database and files, an authenticated application MongoDB archive,
application uploads, and Nginx configuration. Read-only verification against
the existing checksum manifest completed with exit status 0 and every manifest
entry reported `OK`.

The existing manifest lists the Nextcloud file artifact twice. Both entries
passed, but the package accurately records five unique artifacts. Checksum
verification confirms integrity against the existing manifest; it does not
prove successful restoration. Existing records support a manual backup workflow,
not an automated-backup claim.

## Technologies demonstrated

- Proxmox VE and Debian Linux
- Docker and Docker Compose
- Nginx
- React and Express
- MongoDB and MariaDB
- Nextcloud and OnlyOffice
- Uptime Kuma, Portainer, and File Browser
- Ollama and purpose-specific production services
- Bash, Git, health checks, HTTP verification, and SHA-256 verification

## Verification summary

- The selected current services were running at capture time.
- Services with configured Docker health checks reported healthy.
- Five curated public production routes returned HTTP 200.
- Committed source demonstrates service orchestration, proxy relationships,
  health checks, persistence, and application boundaries.
- Five unique existing backup artifacts matched their existing checksum manifest.
- Historical records document service recovery and cautious stabilization work.

## Limitations

- Runtime and HTTP evidence is point-in-time.
- Historical recovery evidence describes a July 2026 event, not current state.
- Checksum verification does not prove successful restoration.
- No high-availability, failover, zero-downtime, or uptime-percentage claim is made.
- No automated, off-site, or immutable-backup claim is made.
- No formal RPO/RTO or disaster-recovery drill claim is made.
- No comprehensive monitoring, complete isolation, performance, traffic, or user-count claim is made.

## Privacy and sanitization

The public package intentionally excludes credentials, environment values,
authentication data, private keys, certificates, database contents, archive
contents, customer/user data, internal addresses, port mappings, network
topology, detailed firewall information, management endpoints, exact mount
paths, volume identifiers, raw configuration, and raw recovery inspections.

See `EVIDENCE_MANIFEST.md` for artifact provenance, capture method,
sanitization, and limitations.
