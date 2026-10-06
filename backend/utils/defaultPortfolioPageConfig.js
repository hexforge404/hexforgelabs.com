const getDefaultPortfolioPageConfig = () => ({
  hero: {
    eyebrow: 'HexForge Labs Portfolio',
    headline: 'Robert Duff — Technical Portfolio',
    subtitle: 'Hands-on troubleshooting, repair, homelab, documentation, and hardware support projects.',
    body: 'I am a hands-on technician in Eaton, Indiana focused on computer troubleshooting, device repair, Linux basics, self-hosted tools, documentation, 3D printing, and practical problem solving. This page collects current and in-progress work examples for employers and local clients.'
  },

  guide: {
    title: 'Portfolio Guide',
    intro: "Looking for the quick version? Pick a topic and I'll point you to the right section.",
    prompts: [
      {
        label: 'What kind of work do you do?',
        response: 'Robert focuses on hands-on troubleshooting, device repair, Linux basics, self-hosted systems, documentation, 3D printing, and practical technical support.',
        includeEmail: false
      },
      {
        label: 'Show repair work',
        response: 'The repair section covers phone/device projects, parts replacement, diagnostics, and bench workflow. More photo proof is being added as projects are documented.',
        includeEmail: false
      },
      {
        label: 'Show homelab skills',
        response: 'The homelab section covers Proxmox, Docker/Docker Compose, Linux server basics, self-hosted tools, and support workflow experiments.',
        includeEmail: false
      },
      {
        label: 'How do I contact you?',
        response: 'Use the contact form on this page or email',
        includeEmail: true
      }
    ]
  },

  sections: [
    {
      title: 'Computer & Device Troubleshooting',
      items: [
        'Windows and Linux setup/support',
        'Device cleanup and performance checks',
        'Basic backup and reinstall help',
        'Remote support tooling experience'
      ]
    },
    {
      title: 'Electronics & Repair Work',
      items: [
        'Phone/device repair projects in progress',
        'Charger module and small-component repair documentation planned',
        'Parts replacement, diagnostics, and careful bench workflow',
        'Photos and write-ups coming as projects are documented'
      ]
    },
    {
      title: 'Homelab & Self-Hosted Systems',
      items: [
        'Proxmox VE virtual machine basics',
        'Docker / Docker Compose services',
        'Linux server setup and maintenance',
        'Self-hosted tools, documentation, and support workflow experiments'
      ]
    },
    {
      title: '3D Printing & Hardware Workflow',
      items: [
        '3D printer setup, calibration, and troubleshooting',
        'Material profiles and repeatable setup notes',
        'Repair, maintenance, and production workflow documentation',
        'Custom printed parts and small-product prototyping'
      ]
    },
    {
      title: 'Documentation & Process',
      items: [
        'Notion / Markdown process notes',
        'Repair logs and checklists',
        'Application/job-search tracker workflow',
        'Repeatable instructions for technical tasks'
      ]
    }
  ],

  projects: {
    heading: 'Featured Projects / Proof of Work',
    intro: 'Completed projects backed by reviewed implementation, runtime, and verification evidence.',
    items: [
      {
        slug: 'website-platform',
        category: 'Software / Web Platform',
        title: 'Website Platform',
        summary: 'A React, Express, and MongoDB website platform with specialized public pages, authenticated administrative editing, sanitized configuration APIs, code defaults, and a Dockerized deployed stack.',
        challenge: 'Provide specialized public experiences whose structured content can be maintained through authenticated Admin tooling while retaining safe code defaults and predictable rendering.',
        workPerformed: [
          'Built specialized Portfolio, Memorial / Family, and Funeral Home Director page support',
          'Added Mongoose-backed structured page configuration',
          'Added authenticated Admin editing APIs and dedicated editors',
          'Sanitized and bounded editable configuration',
          'Merged stored configuration over code defaults',
          'Added Portfolio routing and /work redirect',
          'Added specialized React rendering with fallback content',
          'Verified the deployed stack and produced a proof-of-work package'
        ],
        technologies: ['React', 'React Router', 'Express', 'MongoDB', 'Mongoose', 'Nginx', 'Docker', 'Git'],
        verification: [
          'Portfolio route returned HTTP 200 through the locally exposed deployed endpoint',
          'Public Portfolio configuration API returned HTTP 200',
          'Nginx, backend, and MongoDB containers were running and healthy at capture time',
          'Existing general frontend suite passed 7 of 7 tests',
          'Existing tests were general frontend tests, not Portfolio-specific',
          'Fresh optimized frontend build completed successfully with exit status 0 and no reported warnings'
        ],
        screenshots: [
          {
            src: '/images/portfolio/website-platform/public-portfolio.png',
            alt: 'Full Technical Portfolio page showing the hero, skill sections, project queue, contact details, and contact form',
            caption: 'Public Technical Portfolio rendered by the deployed website stack.'
          },
          {
            src: '/images/portfolio/website-platform/admin-landing-pages.png',
            alt: 'Landing Pages manager with Memorial, Funeral Home Director, and Technical Portfolio system pages listed',
            caption: 'Landing Pages manager showing the three specialized system pages.'
          },
          {
            src: '/images/portfolio/website-platform/portfolio-editor.png',
            alt: 'Technical Portfolio editor showing editable Hero and Portfolio Guide fields',
            caption: 'Technical Portfolio editor with representative Hero and Portfolio Guide fields; lower editor controls are outside the captured viewport.'
          }
        ],
        provenance: {
          label: 'Reviewed proof-of-work package',
          baselineCommit: '92ba889',
          evidenceCommit: '4924ae0'
        },
        caseStudyPath: ''
      },
      {
        slug: 'homelab-infrastructure',
        category: 'Infrastructure / DevOps / Systems Operations',
        title: 'Homelab & Production Infrastructure',
        summary: 'A self-hosted production environment built and operated on owned hardware, combining Proxmox virtualization, containerized application services, Nginx reverse-proxy routing, persistent data, collaboration tooling, monitoring, backup verification, and dependency-aware recovery.',
        challenge: 'Operate the infrastructure supporting real HexForge public and internal workloads on shared self-hosted hardware while keeping services observable, persistent data protected, backups independently verifiable, and recovery work controlled enough to avoid destructive maintenance before dependencies were understood.',
        workPerformed: [
          'Operated a Proxmox VE production host on an HP Z840 with Debian Linux and dedicated system, application, and backup storage roles',
          'Ran containerized application, database, AI, production-tool, collaboration, and operations workloads with Docker Compose',
          'Configured Nginx for TLS termination, static frontend delivery, SPA routing, reverse proxying, and protected application boundaries',
          'Maintained separated frontend, Express backend, MongoDB, assistant, media, and production-tool services',
          'Operated Nextcloud, MariaDB, and OnlyOffice as a self-hosted collaboration stack alongside production application workloads',
          'Used Uptime Kuma, Portainer, File Browser, and configured Docker health checks for operational visibility and administration',
          'Maintained persistent application data and separate backup storage rather than treating containers as the system of record',
          'Recovered and validated affected services during a documented historical stabilization event using an assess → stabilize → classify → protect data → verify → consider cleanup workflow',
          'Classified stopped and legacy resources before cleanup and protected persistent data before destructive maintenance',
          'Maintained manual backup generations and independently reverified preserved backup artifacts against their SHA-256 manifest'
        ],
        technologies: ['Proxmox VE', 'Debian Linux', 'Docker', 'Docker Compose', 'Nginx', 'MongoDB', 'MariaDB', 'Nextcloud', 'OnlyOffice', 'Uptime Kuma', 'Portainer', 'Bash'],
        verification: [
          'Current production observations confirmed the Proxmox host and active containerized application, AI/production, collaboration, and operations workloads at capture time',
          'Configured Docker health checks reported healthy for selected core services; running services without configured health checks are represented only as running',
          'Five selected public production routes returned HTTP 200 during the current point-in-time verification',
          'Historical July 2026 records document dependency-aware service recovery, resource classification, data protection, and stabilization before cleanup',
          'A preserved September 2026 backup generation contained five unique collaboration, application, upload, and Nginx configuration artifacts',
          'Live re-verification of that backup manifest completed with exit status 0; all six manifest entries matched, representing five unique artifacts because one Nextcloud files entry appears twice',
          'Backup integrity was independently reverified against the preserved SHA-256 manifest. Restoration testing, automated/off-site backup, and formal disaster-recovery objectives remain separate future validation work.'
        ],
        screenshots: [
          {
            src: '/images/portfolio/homelab-infrastructure/01-infrastructure-architecture.png',
            alt: 'Sanitized HexForge production infrastructure architecture showing the gateway, application services, collaboration and operations tooling, Proxmox platform, and persistent and backup storage',
            caption: 'Functional architecture of the self-hosted production, collaboration, operations, and storage layers.'
          },
          {
            src: '/images/portfolio/homelab-infrastructure/02-production-host.png',
            alt: 'Sanitized HexForge production host evidence showing the HP Z840 Proxmox platform, compute resources, and separated storage roles',
            caption: 'Owned HP Z840 hardware operating as the Proxmox production host with distinct system, application, and backup storage roles.'
          },
          {
            src: '/images/portfolio/homelab-infrastructure/03-service-operations.png',
            alt: 'Sanitized HexForge service operations evidence showing application, AI and production, collaboration, and operations workloads with healthy and running state distinctions',
            caption: 'Observed workload groups with configured Docker health results distinguished from running-only service state.'
          },
          {
            src: '/images/portfolio/homelab-infrastructure/04-recovery-stabilization.png',
            alt: 'Historical HexForge recovery and stabilization workflow showing assess, stabilize, classify, protect data, verify, and consider cleanup stages',
            caption: 'Documented dependency-aware recovery workflow used during the July 2026 stabilization event.'
          },
          {
            src: '/images/portfolio/homelab-infrastructure/05-backup-integrity.png',
            alt: 'HexForge backup integrity evidence showing five unique backup artifacts verified against a SHA-256 manifest with restoration testing explicitly separated',
            caption: 'Preserved backup generation independently reverified against its SHA-256 manifest; integrity verification is not represented as restoration testing.'
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
  },

  currentQueue: {
    heading: 'Current Project Queue',
    items: [
      'Phone charger module repair proof sheet',
      '3D printer calibration notes'
    ]
  },

  contact: {
    heading: 'Contact',
    name: 'Robert Duff',
    location: 'Eaton, Indiana',
    helpButtonText: 'View Help Page'
  },

  contactForm: {
    heading: 'Contact Robert'
  },

  seo: {
    title: 'Technical Portfolio | HexForge Labs',
    description: 'Technical troubleshooting, repair, homelab, documentation, 3D printing, and hardware support work from HexForge Labs.'
  }
});

module.exports = { getDefaultPortfolioPageConfig };
