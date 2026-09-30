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
      }
    ]
  },

  currentQueue: {
    heading: 'Current Project Queue',
    items: [
      'Phone charger module repair documentation',
      'Basic repair photo proof sheet',
      'Homelab summary write-up',
      '3D printer calibration notes',
      'Portfolio photos and screenshots'
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
