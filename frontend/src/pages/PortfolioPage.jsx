import React from 'react';
import { Link } from 'react-router-dom';
import ContactForm from 'components/ContactForm';
import GuidedHelperWidget from 'components/GuidedHelperWidget';
import { SUPPORT_EMAIL } from '../config';

const portfolioSections = [
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
];

const currentQueue = [
  'Phone charger module repair documentation',
  'Basic repair photo proof sheet',
  'Homelab summary write-up',
  '3D printer calibration notes',
  'Portfolio photos and screenshots'
];

const portfolioTopics = [
  'Employer / hiring inquiry',
  'Technical project question',
  'Local support question',
  'Other'
];

const portfolioHelperPrompts = [
  {
    label: 'What kind of work do you do?',
    response: 'Robert focuses on hands-on troubleshooting, device repair, Linux basics, self-hosted systems, documentation, 3D printing, and practical technical support.'
  },
  {
    label: 'Show repair work',
    response: 'The repair section covers phone/device projects, parts replacement, diagnostics, and bench workflow. More photo proof is being added as projects are documented.'
  },
  {
    label: 'Show homelab skills',
    response: 'The homelab section covers Proxmox, Docker/Docker Compose, Linux server basics, self-hosted tools, and support workflow experiments.'
  },
  {
    label: 'How do I contact you?',
    response: 'Use the contact form on this page or email',
    includeEmail: true
  }
];

function PortfolioPage() {
  return (
    <main className="public-info-page">
      <section className="public-info-hero">
        <p className="public-info-eyebrow">HexForge Labs Portfolio</p>
        <h1>Robert Duff — Technical Portfolio</h1>
        <p className="public-info-subtitle">
          Hands-on troubleshooting, repair, homelab, documentation, and hardware support projects.
        </p>
        <p>
          I am a hands-on technician in Eaton, Indiana focused on computer troubleshooting,
          device repair, Linux basics, self-hosted tools, documentation, 3D printing, and
          practical problem solving. This page collects current and in-progress work examples
          for employers and local clients.
        </p>
      </section>

      <GuidedHelperWidget
        title="Portfolio Guide"
        intro="Looking for the quick version? Pick a topic and I'll point you to the right section."
        prompts={portfolioHelperPrompts}
      />

      <section className="public-info-grid" aria-label="Portfolio work examples">
        {portfolioSections.map((section) => (
          <article className="public-info-card" key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="public-info-split">
        <article className="public-info-card public-info-card--accent">
          <h2>Current Project Queue</h2>
          <ul>
            {currentQueue.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="public-info-contact">
          <h2>Contact</h2>
          <p>
            <strong>Robert Duff</strong>
            <br />
            Eaton, Indiana
            <br />
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <div className="public-info-actions">
            <Link className="public-info-link" to="/help">
              View Help Page
            </Link>
          </div>
        </article>
      </section>

      <section className="public-info-contact public-info-contact--wide">
        <ContactForm
          pageSource="portfolio"
          topics={portfolioTopics}
          heading="Contact Robert"
        />
      </section>
    </main>
  );
}

export default PortfolioPage;
