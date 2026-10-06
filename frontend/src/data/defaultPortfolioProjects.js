const DEFAULT_PORTFOLIO_PROJECTS = {
  heading: 'Featured Projects / Proof of Work',
  intro: 'Completed projects backed by reviewed implementation, runtime, and verification evidence.',
  items: [
    {
      slug: 'website-platform',
      category: 'Software / Business Operations Platform',
      title: 'Website Platform',
      summary: 'A full-stack business and production operations platform connecting the public HexForge storefront with authenticated administration, custom-order intake, commerce monitoring, production print-job workflows, specialized content management, and Notion-backed inventory.',
      challenge: 'Build one maintainable platform that can serve customer-facing product and campaign experiences while giving HexForge authenticated operational tools for managing structured content, orders, production work, monitoring, promotions, and inventory without collapsing those concerns into the public storefront.',
      workPerformed: [
        'Built the React storefront and custom lithophane product and intake experience',
        'Built specialized Portfolio, Memorial / Family, and Funeral Home Director experiences',
        'Added authenticated Admin tooling for operational and structured-content workflows',
        'Connected order records to production-queue and print-job workflows',
        'Added payment and webhook monitoring with reconciliation visibility',
        'Integrated Notion-backed inventory visibility into Admin',
        'Added protected promotion management and audit tooling',
        'Added a deployment- and runtime-gated internal test pipeline separated from normal production records',
        'Added Mongoose-backed structured page configuration with sanitization, bounded inputs, code defaults, and stored overrides',
        'Deployed the React, Express, and MongoDB platform behind Nginx in Docker and verified public and administrative workflows against production'
      ],
      technologies: ['React', 'React Router', 'Express', 'MongoDB', 'Mongoose', 'Nginx', 'Docker', 'Stripe', 'Notion', 'Git'],
      verification: [
        'Public storefront, custom lithophane product intake, Memorial, Funeral Home Director, and Technical Portfolio routes returned HTTP 200 during production verification',
        'Authenticated Admin evidence captured order, production-queue, print-job, monitoring, inventory, and structured-content interfaces',
        'Production Queue showed records distributed across operational workflow stages at capture time',
        'Print Jobs exposed production records and technical handoff controls; the evidence does not establish automated physical printing or fulfillment',
        'Monitoring exposed webhook and payment-reconciliation state, including records requiring attention; the evidence does not establish complete payment reconciliation',
        'Admin inventory displayed Notion-backed inventory records at capture time',
        'Internal Test Pipeline was visibly disabled at the deployment level during the production audit',
        'Customer and transaction identifiers were redacted from portfolio derivatives while the source evidence was preserved separately'
      ],
      screenshots: [
        {
          src: '/images/portfolio/website-platform/01-custom-product-intake.png',
          alt: 'HexForge custom lithophane product page showing product imagery, pricing, photo guidance, and customer configuration controls',
          caption: 'Customer-facing custom lithophane product and intake experience.'
        },
        {
          src: '/images/portfolio/website-platform/02-production-queue.png',
          alt: 'HexForge Admin Production Queue showing orders distributed across production workflow stages',
          caption: 'Authenticated Production Queue providing operational visibility across staged production work.'
        },
        {
          src: '/images/portfolio/website-platform/03-print-jobs.png',
          alt: 'HexForge Admin Print Jobs view showing production records, technical fields, and job controls',
          caption: 'Print-job management and technical handoff controls inside the authenticated Admin platform.'
        },
        {
          src: '/images/portfolio/website-platform/04-monitoring-redacted.png',
          alt: 'HexForge Admin Monitoring view showing summary counts, webhook audit status, and redacted payment reconciliation records',
          caption: 'Operational monitoring and reconciliation visibility; transaction identifiers are redacted in the portfolio derivative.'
        },
        {
          src: '/images/portfolio/website-platform/05-notion-inventory.png',
          alt: 'HexForge Admin Inventory view showing Notion-backed inventory records and quantities',
          caption: 'Notion-backed inventory visibility integrated into the authenticated Admin interface.'
        },
        {
          src: '/images/portfolio/website-platform/06-portfolio-editor.png',
          alt: 'HexForge Technical Portfolio Admin editor showing structured Hero and Portfolio Guide controls',
          caption: 'Authenticated structured-content editor used to maintain the Technical Portfolio experience.'
        }
      ],
      provenance: {
        label: 'Reviewed production proof-of-work',
        baselineCommit: '',
        evidenceCommit: ''
      },
      caseStudyPath: ''
    },
    {
      slug: 'homelab-infrastructure',
      category: 'Infrastructure / Operations',
      title: 'Homelab & Production Infrastructure',
      summary: 'Operated and recovered a Proxmox-based self-hosted environment running Docker Compose services behind Nginx, with persistent application data, health checks, administration tools, and documented backup-integrity and stabilization workflows.',
      challenge: 'Keep public and internal services maintainable and recoverable on shared self-hosted infrastructure while protecting persistent data, verifying service state, and avoiding destructive maintenance before dependencies and backups were understood.',
      workPerformed: [
        'Operated a Proxmox VE host running Debian Linux and Docker Compose services',
        'Configured Nginx for TLS, static frontend delivery, and reverse proxy routing',
        'Maintained separated frontend, backend, database, assistant, and production-tool services',
        'Used persistent storage and health checks for core services',
        'Recovered and validated Nextcloud, OnlyOffice, Uptime Kuma, Portainer, and File Browser during a documented historical stabilization event',
        'Classified stopped services and protected persistent data before considering cleanup',
        'Maintained documented manual backup sets for collaboration and application services',
        'Verified existing backup artifacts against their SHA-256 manifest'
      ],
      technologies: ['Proxmox VE', 'Debian Linux', 'Docker', 'Docker Compose', 'Nginx', 'MongoDB', 'MariaDB', 'Nextcloud', 'OnlyOffice', 'Uptime Kuma', 'Portainer', 'Bash'],
      verification: [
        'Selected production containers were running at capture time; configured health checks reported healthy where available',
        'Five curated public production routes returned HTTP 200 during point-in-time verification',
        'Five unique existing backup artifacts matched their existing SHA-256 manifest',
        'Checksum verification confirms archive integrity against the manifest, not successful restoration',
        'Historical July 2026 records document service recovery, classification, data protection, and stabilization before cleanup',
        'No high-availability, uptime-percentage, automated-backup, off-site or immutable-backup, or RPO/RTO claim is made'
      ],
      screenshots: [
        {
          src: '/images/portfolio/homelab-infrastructure/infrastructure-overview.png',
          alt: 'Sanitized HexForge production homelab architecture showing the Nginx gateway, application services, collaboration and operations tools, Proxmox platform, and persistent and backup storage',
          caption: 'Sanitized functional overview of the self-hosted production, collaboration, operations, and storage layers.'
        }
      ],
      provenance: {
        label: 'Reviewed proof-of-work package',
        baselineCommit: '0daa44b',
        evidenceCommit: '00e613e'
      },
      caseStudyPath: ''
    },
    {
      slug: 'evidence-driven-content-pipeline',
      category: 'Systems Automation / Evidence Pipeline',
      title: 'HexForge Capture & Evidence Pipeline',
      summary: 'A cross-platform capture and evidence pipeline that turns real technical work into structured, provenance-aware session packages for controlled downstream processing.',
      challenge: 'Preserve the context of real workshop and technical work across video, terminal activity, transcripts, markers, and supporting notes while creating a reliable boundary between raw capture and downstream automation.',
      workPerformed: [
        'Built a PowerShell-based Windows Runner for project and session management with OBS-assisted technical-work capture',
        'Collected video, terminal logs, transcripts, screenshots, and session metadata under structured project and session directories',
        'Integrated marker and HexScribe-derived evidence for identifying important moments within long-form technical recordings',
        'Generated structured manifests and content-preparation artifacts including script outlines, clip lists, narration drafts, short-form drafts, and video-workup notes',
        'Preserved source identity and artifact relationships through explicit project and part metadata with per-file SHA-256 provenance',
        'Packaged finalized sessions behind a defined ingest boundary for downstream HexForge AI-Ops processing',
        'Kept capture and packaging responsibility separate from downstream interpretation, rendering, review, and publication authority'
      ],
      technologies: ['PowerShell', 'Windows', 'OBS Studio', 'JSON', 'SHA-256', 'HexScribe', 'Python', 'Linux', 'Proxmox'],
      verification: [
        'Real charger-mod-repair / 001_next workload recorded a 1,098,575,810-byte source video together with a terminal log and transcript',
        'Capture finalized under the hexforge.capture_session_manifest v1 contract and was marked ready_for_ingest',
        'Derived evidence package preserved marker, HexScribe, content-workup, session, and transcript artifacts with individual SHA-256 hashes',
        'Explicit handoff targeted hexforge-ai-ops through local_manifest ingest',
        'Original capture manifest kept upload disabled and recorded the archive hash as pending until archive creation rather than claiming premature verification',
        'Downstream interpretation, rendering, narration, human review, and publication authority remain outside this project boundary'
      ],
      screenshots: [
        {
          src: '/images/portfolio/content-pipeline/capture-evidence-architecture-v2.png',
          alt: 'HexForge Capture and Evidence Pipeline architecture showing real technical work flowing through Runner and OBS capture, structured session evidence, provenance, and a controlled AI-Ops handoff boundary',
          caption: 'Audited capture-to-handoff architecture separating evidence collection and packaging from downstream AI-Ops processing and publication authority.'
        },
        {
          src: '/images/portfolio/content-pipeline/real-workload-proof.png',
          alt: 'Real charger-board repair workshop footage used as a technical-work capture workload for the HexForge Capture and Evidence Pipeline',
          caption: 'A real charger-board repair session exercised the capture workflow and supplied source evidence for the structured handoff pipeline.'
        }
      ],
      provenance: {
        label: 'Reviewed proof-of-work package',
        baselineCommit: '',
        evidenceCommit: ''
      },
      caseStudyPath: ''
    }
  ]
};

export default DEFAULT_PORTFOLIO_PROJECTS;
