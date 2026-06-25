import React from 'react';
import { SUPPORT_EMAIL } from '../config';

const helpSections = [
  {
    title: 'Computer Help',
    items: [
      'PC setup and troubleshooting',
      'Slow computer checks',
      'Backup guidance',
      'OS reinstall help by request',
      'Basic Linux setup'
    ]
  },
  {
    title: 'Device & Repair Help',
    items: [
      'Device diagnostics',
      'Phone/device repair projects by request',
      'Parts replacement where practical',
      'Clear explanation before work begins'
    ]
  },
  {
    title: '3D Printer / Maker Help',
    items: [
      'Printer setup',
      'Calibration troubleshooting',
      'Basic maintenance',
      'Print workflow support'
    ]
  },
  {
    title: 'Remote / Local Support',
    items: [
      'Remote support by request when appropriate',
      'Local support in the Eaton / Muncie area',
      'Email first to describe the issue'
    ]
  }
];

function HelpPage() {
  const helpRequestHref = `mailto:${SUPPORT_EMAIL}?subject=HexForge%20Labs%20Help%20Request`;

  return (
    <main className="public-info-page">
      <section className="public-info-hero">
        <p className="public-info-eyebrow">Support Contact</p>
        <h1>HexForge Labs Help</h1>
        <p className="public-info-subtitle">
          Local computer, device, and technical troubleshooting help in the Eaton / Muncie area.
        </p>
        <p>
          This is a simple contact page for support requests. A full client portal may be
          added later, but this page is currently for direct email contact.
        </p>
      </section>

      <section className="public-info-grid" aria-label="Help services">
        {helpSections.map((section) => (
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

      <section className="public-info-contact public-info-contact--wide">
        <h2>Request Help</h2>
        <div className="public-info-contact-grid">
          <p>
            <strong>Email:</strong>
            <br />
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p>
            <strong>Location:</strong>
            <br />
            Eaton, Indiana / Muncie-area support
          </p>
        </div>
        <a className="public-info-button" href={helpRequestHref}>
          Request Help
        </a>
        <p className="public-info-note">
          Please include your device type, issue, and best contact method.
        </p>
      </section>
    </main>
  );
}

export default HelpPage;
