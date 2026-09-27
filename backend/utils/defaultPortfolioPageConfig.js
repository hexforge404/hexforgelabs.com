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
