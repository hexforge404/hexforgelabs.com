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
