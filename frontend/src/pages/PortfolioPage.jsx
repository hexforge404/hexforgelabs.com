import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ContactForm from 'components/ContactForm';
import GuidedHelperWidget from 'components/GuidedHelperWidget';
import PortfolioProjectCard from 'components/PortfolioProjectCard';
import { SUPPORT_EMAIL } from '../config';
import API_BASE_URL from '../utils/apiBase';
import DEFAULT_PORTFOLIO_PROJECTS from '../data/defaultPortfolioProjects';

const DEFAULT_CONFIG = {
  hero: {
    eyebrow: 'HexForge Labs Portfolio',
    headline: 'Robert Duff — Technical Portfolio',
    subtitle: 'Hands-on technical support, troubleshooting, Linux, repair, documentation, and infrastructure projects.',
    body: 'I am a hands-on technician in Eaton, Indiana building evidence-backed work for IT support and technical operations roles across troubleshooting, Linux, self-hosted systems, documentation, repair, and hardware workflows. Local computer and device support information is available below.'
  },

  guide: {
    title: 'Portfolio at a glance',
    intro: 'Completed proof-backed projects appear first. The capability sections below include broader hands-on experience and proof still in progress.',
    prompts: [
      {
        label: 'Demonstrated work',
        response: 'Website Platform, Homelab & Production Infrastructure, and the HexForge Capture & Evidence Pipeline are completed projects backed by reviewed evidence.',
        includeEmail: false
      },
      {
        label: 'Hands-on experience',
        response: 'Broader work includes computer and device troubleshooting, Linux, documentation, 3D printing, hardware workflows, and practical technical support.',
        includeEmail: false
      },
      {
        label: 'Proof in progress',
        response: 'Repair documentation and 3D-printer calibration proof are still being developed and are not presented as completed Featured Projects.',
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

  projects: DEFAULT_PORTFOLIO_PROJECTS,

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
    helpButtonText: 'View support options'
  },

  contactForm: {
    heading: 'Contact Robert'
  },

  seo: {
    title: 'Technical Portfolio | HexForge Labs',
    description: 'Technical troubleshooting, repair, homelab, documentation, 3D printing, and hardware support work from HexForge Labs.'
  }
};

const portfolioTopics = [
  'Employer / hiring inquiry',
  'Technical project question',
  'Local support question',
  'Other'
];

const reconcileProjects = (incomingProjects, defaultProjects) => {
  if (!Array.isArray(incomingProjects) || incomingProjects.length === 0) return defaultProjects;

  const seenSlugs = new Set();
  const reconciled = incomingProjects.filter((project) => {
    const slug = typeof project?.slug === 'string' ? project.slug.trim() : '';
    if (!slug) return true;
    if (seenSlugs.has(slug)) return false;
    seenSlugs.add(slug);
    return true;
  });

  defaultProjects.forEach((project) => {
    if (!seenSlugs.has(project.slug)) {
      reconciled.push(project);
      seenSlugs.add(project.slug);
    }
  });

  return reconciled;
};

const mergeConfig = (incoming = {}) => ({
  hero: {
    ...DEFAULT_CONFIG.hero,
    ...(incoming.hero || {})
  },

  guide: {
    ...DEFAULT_CONFIG.guide,
    ...(incoming.guide || {}),
    prompts:
      Array.isArray(incoming.guide?.prompts) && incoming.guide.prompts.length
        ? incoming.guide.prompts
        : DEFAULT_CONFIG.guide.prompts
  },

  sections:
    Array.isArray(incoming.sections) && incoming.sections.length
      ? incoming.sections
      : DEFAULT_CONFIG.sections,

  projects: {
    ...DEFAULT_CONFIG.projects,
    ...(incoming.projects || {}),
    items: reconcileProjects(incoming.projects?.items, DEFAULT_CONFIG.projects.items)
  },

  currentQueue: {
    ...DEFAULT_CONFIG.currentQueue,
    ...(incoming.currentQueue || {}),
    items:
      Array.isArray(incoming.currentQueue?.items) && incoming.currentQueue.items.length
        ? incoming.currentQueue.items
        : DEFAULT_CONFIG.currentQueue.items
  },

  contact: {
    ...DEFAULT_CONFIG.contact,
    ...(incoming.contact || {})
  },

  contactForm: {
    ...DEFAULT_CONFIG.contactForm,
    ...(incoming.contactForm || {})
  },

  seo: {
    ...DEFAULT_CONFIG.seo,
    ...(incoming.seo || {})
  }
});

function PortfolioPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE_URL}/landing-page/portfolio`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Portfolio config request failed');
        }
        return response.json();
      })
      .then((data) => {
        if (active && data?.success && data?.config) {
          setConfig(mergeConfig(data.config));
        }
      })
      .catch(() => {
        // Keep the built-in defaults if the config endpoint is unavailable.
      })
      .finally(() => {
        if (active) setConfigLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const originalTitle = document.title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const originalDescription = descriptionMeta?.getAttribute('content');

    document.title = config.seo.title;
    if (descriptionMeta) descriptionMeta.setAttribute('content', config.seo.description);

    return () => {
      document.title = originalTitle;
      if (descriptionMeta && originalDescription !== null) {
        descriptionMeta.setAttribute('content', originalDescription);
      }
    };
  }, [config.seo.title, config.seo.description]);

  return (
    <main className="public-info-page">
      <section className="public-info-hero">
        <p className="public-info-eyebrow">{config.hero.eyebrow}</p>
        <h1>{config.hero.headline}</h1>
        <p className="public-info-subtitle">{config.hero.subtitle}</p>
        <p>{config.hero.body}</p>
      </section>

      <GuidedHelperWidget
        key={configLoaded ? 'portfolio-config-loaded' : 'portfolio-config-default'}
        title={config.guide.title}
        intro={config.guide.intro}
        prompts={config.guide.prompts}
      />

      <section className="portfolio-projects" aria-labelledby="portfolio-projects-heading">
        <div className="portfolio-projects-heading">
          <p className="public-info-eyebrow">Proof-backed work</p>
          <h2 id="portfolio-projects-heading">{config.projects.heading}</h2>
          <p>{config.projects.intro}</p>
        </div>
        <div className="portfolio-projects-list">
          {config.projects.items.map((project, index) => (
            <PortfolioProjectCard
              key={project.slug || `${project.title}-${index}`}
              project={project}
            />
          ))}
        </div>
      </section>

      <section className="public-info-grid" aria-label="Portfolio work examples">
        {config.sections.map((section, sectionIndex) => (
          <article
            className="public-info-card"
            key={`${section.title}-${sectionIndex}`}
          >
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="public-info-split">
        <article className="public-info-card public-info-card--accent">
          <h2>{config.currentQueue.heading}</h2>
          <ul>
            {config.currentQueue.items.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="public-info-contact">
          <h2>{config.contact.heading}</h2>
          <p>
            <strong>{config.contact.name}</strong>
            <br />
            {config.contact.location}
            <br />
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <div className="public-info-actions">
            <Link className="public-info-link" to="/help">
              {config.contact.helpButtonText}
            </Link>
          </div>
        </article>
      </section>

      <section className="public-info-contact public-info-contact--wide">
        <ContactForm
          pageSource="portfolio"
          topics={portfolioTopics}
          heading={config.contactForm.heading}
        />
      </section>
    </main>
  );
}

export default PortfolioPage;
