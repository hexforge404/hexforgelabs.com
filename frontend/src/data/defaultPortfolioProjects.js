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
      category: 'AI / Content Pipeline',
      title: 'Evidence-Driven Capture & Content Pipeline',
      summary: 'A cross-platform, provenance-aware workflow that turns real technical-work capture into evidence-bound private-review media while preserving human correction, controlled execution, and a separate publication boundary.',
      challenge: 'Turn long-form workshop capture into traceable, reviewable media without losing source provenance, human correction, execution controls, or the boundary between private approval and publication authority.',
      workPerformed: [
        'Built a Windows Runner and OBS capture workflow with session manifests, package provenance, and SHA-256 hashes',
        'Connected capture packages to Proxmox and AI-Ops ingest and evidence processing',
        'Added evidence resolution with explicit human-correction handling and preserved uncertainty',
        'Built deterministic edit, transition, narration, and FFmpeg render stages',
        'Integrated local Piper narration with timing and postprocessing checks',
        'Enforced private-render authorization, single-use execution, verification receipts, and human review',
        'Diagnosed the V3.2 narration-placement defect and corrected FFmpeg adelay timing for V3.3',
        'Preserved a hard boundary between private-review approval and publication or deployment authority'
      ],
      technologies: ['Windows', 'OBS', 'Linux', 'Proxmox', 'Python', 'FFmpeg', 'JSON', 'SHA-256', 'Ollama', 'Piper'],
      verification: [
        'Original workshop capture was preserved through manifest, package, and SHA-256 provenance',
        'Evidence resolution retained human corrections and explicit uncertainty boundaries',
        'V3.2 narration placement failed human review rather than being accepted as a successful result',
        'V3.3 replaced decimal-second FFmpeg adelay values with exact integer-millisecond timing and used a fresh controlled lifecycle',
        'Final V3.3 output was 216.25 seconds: H.264 1920×1080 at 60 fps with AAC 48 kHz stereo audio',
        'Final V3.3 SHA-256: 40eb562d40349eeb4bba2d38351891a0ca9f20ef3d13fc3a956fbfba05bb1214',
        'Human review approved the corrected V3.3 output for private review',
        'Publication and deployment remained unauthorized'
      ],
      screenshots: [
        {
          src: '/images/portfolio/content-pipeline/system-architecture.png',
          alt: 'Evidence-driven capture-to-review architecture showing primary Runner and OBS capture, provenance, AI-Ops processing, deterministic rendering, human review, and a locked publication boundary',
          caption: 'Cross-platform capture-to-review architecture with provenance tracking, deterministic rendering, and explicit human control gates.'
        },
        {
          src: '/images/portfolio/content-pipeline/evidence-control-lifecycle.png',
          alt: 'Ten-stage evidence and execution-control lifecycle with the failed V3.2 review, corrected V3.3 timing, private approval, and publication remaining unauthorized',
          caption: 'Authorization, single-use execution, verification, and human review remain separate from publication authority.'
        },
        {
          src: '/images/portfolio/content-pipeline/real-workload-proof.png',
          alt: 'Real charger-board repair workshop footage with a phone charging indication used as evidence for the capture and content pipeline',
          caption: 'A real charger-board repair supplied genuine workshop evidence for exercising the pipeline; no carrier-service result is claimed.'
        },
        {
          src: '/images/portfolio/content-pipeline/verified-private-review-result.png',
          alt: 'Verified V3.3 private-review result showing media properties, human-review checks, output hash, and publication and deployment not authorized',
          caption: 'Corrected V3.3 output passed verification and full private review while remaining unpublished and undeployed.'
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
