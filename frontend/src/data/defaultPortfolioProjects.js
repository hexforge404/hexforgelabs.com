const DEFAULT_PORTFOLIO_PROJECTS = {
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
    }
  ]
};

export default DEFAULT_PORTFOLIO_PROJECTS;
