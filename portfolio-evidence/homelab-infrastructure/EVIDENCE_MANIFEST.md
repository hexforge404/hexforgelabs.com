# Evidence Manifest

Package baseline: branch `main`, commit
`0daa44b115eeb09da8300883bb12fc932e5be5a1` (`0daa44b`). Collection date:
2026-09-30. Package human-review status: **APPROVED**.

Final human review occurred on 2026-09-30. The reviewer explicitly approved
`07-infrastructure-overview.png` after visual inspection, and all evidence
artifacts are approved for this proof-of-work package.

| Artifact | Source and capture method | Current / historical | What it supports | Sanitization | Limitations | Human review |
|---|---|---|---|---|---|---|
| `01-host-platform.txt` | Read-only `pveversion`, kernel, uptime, CPU, memory, block-device, and filesystem observations | Current, point-in-time | Proxmox/Debian platform, generalized hardware, compute, uptime, and storage roles | Omits identifiers, addresses, guest IDs, device names, mounts, serials, topology, and utilization | No HA, failover, performance, capacity, or uptime-percentage claim | Approved |
| `02-service-health.txt` | Explicitly allowlisted Docker state/health inspection | Current, point-in-time | Selected production, collaboration, AI/tool, and operations services were running; configured health checks reported their observed status | Omits IDs, ports, addresses, hostnames, labels, environment, networks, mounts, volumes, and unrelated/stopped services | Running without a configured health check is not represented as independently health-verified; not an uptime claim | Approved |
| `03-production-verification.txt` | Unauthenticated HTTPS GET requests with redirect following; final status only | Current, point-in-time | Public frontend, SPA, and API routes returned HTTP 200 | No bodies, headers, cookies, authentication data, or private endpoints retained | Not an uptime, performance, traffic, or availability measurement | Approved |
| `04-architecture-proof.txt` | Narrow committed-source references in Compose, Nginx, and backend entry-point files plus allowlisted runtime corroboration | Current source and current point-in-time runtime | Orchestration, internal service network, health checks, static frontend, proxy routing, persistence, and service separation | No configuration blocks, environments, credentials, addresses, ports, paths, SSH details, certificates, mounts, volumes, or sensitive routing details | Intended source architecture and observed runtime do not prove complete isolation, HA, failover, or exhaustive security | Approved |
| `05-backup-integrity.txt` | `stat` on five allowlisted existing September artifacts and read-only `sha256sum -c` against the existing manifest | Existing backup set; current verification | Five unique backup categories existed and every manifest entry matched | Omits paths, raw hashes, archive contents, user data, usernames, credentials, and personal filenames | Manifest duplicates one artifact; checksum success does not prove restoration, automation, off-site/immutable storage, or RPO/RTO | Approved |
| `06-recovery-operations.txt` | Sanitized summary of internal July 2026 stabilization and recovery records | Historical | Assessment, recovery/validation, service classification, storage protection, backup verification, and cautious cleanup decisions | Raw records, topology, volume names, unrelated projects, endpoints, credentials, and personal data omitted | Historical narrative; no continuous availability or completed disaster-recovery drill claim | Approved |
| `07-infrastructure-overview.png` | Purpose-built 1600×1000 deterministic architecture diagram based on artifacts 02 and 04 | Current architecture overview | Functional production, collaboration, operations, platform, and storage relationships | Contains no addresses, ports, usernames, URLs, secrets, mounts, IDs, or contact information | Conceptual rather than exhaustive; not a network topology diagram | Approved |
| `08-git-provenance.txt` | Curated read-only Git log limited to relevant infrastructure, verification, privacy, and production-context changes | Historical through baseline | Recorded implementation and security-boundary history | Omits remotes, patches, authors, unrelated history, credentials, and internal operational details | Commit subjects do not prove runtime success by themselves | Approved |
| `README.md` | Evidence-backed package narrative | Current summary incorporating current and historical evidence | Scope, architecture, recovery, backup integrity, technologies, verification, privacy, and qualifications | Contains only generalized public-safe claims | Summary depends on the individual artifacts and their limitations | Approved |
| `EVIDENCE_MANIFEST.md` | Artifact inventory and provenance | Current package metadata | Sources, methods, sanitization, claims, limitations, and review state | No sensitive source values included | Approval applies to this evidence package and does not expand its technical claims | Approved |

## Package-wide claim boundaries

- Runtime evidence is point-in-time.
- Checksum verification does not prove restoration.
- Recovery evidence is historical.
- No high-availability or failover claim is made.
- No uptime-percentage claim is made.
- No automated-backup claim is made.
- No off-site or immutable-backup claim is made.
- No formal RPO/RTO claim is made.
- No disaster-recovery drill claim is made.
