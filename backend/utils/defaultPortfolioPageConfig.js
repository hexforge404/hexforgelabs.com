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
