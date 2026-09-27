import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config';
import '../App.css';

const DEFAULT_CONFIG = {
  hero: {
    eyebrow: 'HexForge Labs | Funeral Home Memorial Keepsake Option',
    headline: 'A simple photo keepsake option for families who ask for something personal',
    introPrimary: 'HexForge Labs creates custom photo-based memorial lithophane lamps from family-submitted photographs. When lit from inside, the image becomes a soft illuminated portrait or memory scene families can display at home, place on a remembrance table when appropriate, or give to close relatives after a service.',
    introSecondary: 'Families work directly with HexForge Labs for photo review, ordering, payment, and fulfillment. Your team can simply share the information sheet or QR code when a family asks about personalized keepsakes.',
    primaryCtaText: 'Request Funeral Home Info Packet',
    primaryCtaSubject: 'Funeral Home Info Packet Request',
    secondaryCtaText: 'View Family Memorial Page',
    secondaryCtaLink: '/memorial',
    imageUrl: '/images/products/litho-lamp/multi-lamp-2.jpg',
    imageAlt: 'A group of illuminated custom lithophane lamps',
    imageCaptionTitle: 'Memorial lithophane lamp preview',
    imageCaptionText: 'Custom photo keepsakes illuminated from within.',
  },
  referral: {
    heading: 'A simple referral path for families who ask about keepsakes',
    body: 'Funeral homes may share an information sheet or QR code with families who ask about personalized memorial keepsakes. Families contact and order directly through HexForge Labs, so your team does not need to manage inventory, collect photos, process payments, or add another formal vendor program before there is proven interest.',
    callout: 'No inventory, photo collection, payment processing, or fulfillment work is required from your team.',
  },
  familyReceives: {
    heading: 'What families receive',
    cards: [
      {
        title: 'Custom photo lamp',
        body: 'A family-selected photograph becomes a warm illuminated portrait or memory scene.',
      },
      {
        title: 'Photo review guidance',
        body: 'HexForge Labs reviews the image and explains what will reproduce clearly before production.',
      },
      {
        title: 'Direct order with HexForge Labs',
        body: 'Families handle order details, payment, delivery, or pickup directly with HexForge Labs.',
      },
    ],
    privacyText: 'Family photos are handled privately and are not used publicly without permission.',
  },
  referralSteps: {
    heading: 'How the referral path works',
    steps: [
      'A funeral home shares the QR code or information sheet when a family asks about personalized keepsakes.',
      'The family reviews options and contacts HexForge Labs directly.',
      'HexForge Labs handles photo guidance, order details, payment, and fulfillment.',
      'The funeral home can request a sample or discuss a display arrangement later if there is interest.',
    ],
  },
  directorSample: {
    heading: 'Optional director sample',
    body: 'Limited director samples can be discussed after your team reviews the information packet, especially if you want to experience the same photo review and keepsake process a family would receive.',
  },
  contact: {
    heading: 'Contact our team',
    bodyBeforeEmail: 'For funeral home programs, information packets, sample questions, or display discussions, contact HexForge Labs at',
    bodyAfterEmail: 'Calls or in-person visits are available by appointment.',
  },
  seo: {
    title: 'Funeral Home Memorial Keepsakes | HexForge Labs',
    description: 'Information for funeral homes about optional custom photo memorial lithophane keepsakes from HexForge Labs.',
  },
};

const mergeConfig = (config) => ({
  hero: { ...DEFAULT_CONFIG.hero, ...(config?.hero || {}) },
  referral: { ...DEFAULT_CONFIG.referral, ...(config?.referral || {}) },
  familyReceives: {
    ...DEFAULT_CONFIG.familyReceives,
    ...(config?.familyReceives || {}),
    cards: Array.isArray(config?.familyReceives?.cards) && config.familyReceives.cards.length
      ? config.familyReceives.cards
      : DEFAULT_CONFIG.familyReceives.cards,
  },
  referralSteps: {
    ...DEFAULT_CONFIG.referralSteps,
    ...(config?.referralSteps || {}),
    steps: Array.isArray(config?.referralSteps?.steps) && config.referralSteps.steps.length
      ? config.referralSteps.steps
      : DEFAULT_CONFIG.referralSteps.steps,
  },
  directorSample: { ...DEFAULT_CONFIG.directorSample, ...(config?.directorSample || {}) },
  contact: { ...DEFAULT_CONFIG.contact, ...(config?.contact || {}) },
  seo: { ...DEFAULT_CONFIG.seo, ...(config?.seo || {}) },
});

const FuneralHomePage = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    let active = true;

    fetch('/api/landing-page/funeral-home')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active || !data?.config) return;
        setConfig(mergeConfig(data.config));
      })
      .catch((error) => {
        console.warn('Funeral home page is using local fallback content:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const primaryHref =
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(config.hero.primaryCtaSubject)}`;

  return (
    <div className="funeral-home-page">
      <section className="funeral-home-hero">
        <div className="funeral-home-hero-overlay">
          <div className="funeral-home-hero-copy">
            <p className="funeral-home-eyebrow">{config.hero.eyebrow}</p>
            <h1>{config.hero.headline}</h1>
            <p>{config.hero.introPrimary}</p>
            <p>{config.hero.introSecondary}</p>

            <div className="funeral-home-cta-row">
              <a
                className="funeral-home-button funeral-home-button--primary"
                href={primaryHref}
              >
                {config.hero.primaryCtaText}
              </a>

              <Link
                className="funeral-home-button funeral-home-button--secondary"
                to={config.hero.secondaryCtaLink}
              >
                {config.hero.secondaryCtaText}
              </Link>
            </div>
          </div>

          <figure className="funeral-home-hero-visual">
            <img src={config.hero.imageUrl} alt={config.hero.imageAlt} />
            <figcaption>
              <strong>{config.hero.imageCaptionTitle}</strong>
              <span>{config.hero.imageCaptionText}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="funeral-home-section">
        <h2>{config.referral.heading}</h2>
        <p>{config.referral.body}</p>
        <p className="funeral-home-callout">{config.referral.callout}</p>
      </section>

      <section className="funeral-home-section">
        <h2>{config.familyReceives.heading}</h2>
        <div className="funeral-home-card-grid">
          {config.familyReceives.cards.map((card, index) => (
            <article className="funeral-home-info-card" key={`${card.title}-${index}`}>
              <span className="funeral-home-card-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
        <p className="funeral-home-privacy">{config.familyReceives.privacyText}</p>
      </section>

      <section className="funeral-home-section">
        <h2>{config.referralSteps.heading}</h2>
        <ol>
          {config.referralSteps.steps.map((step, index) => (
            <li key={`${index}-${step}`}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="funeral-home-section">
        <h2>{config.directorSample.heading}</h2>
        <p>{config.directorSample.body}</p>
      </section>

      <section className="funeral-home-section funeral-home-footer">
        <h2>{config.contact.heading}</h2>
        <p>
          {config.contact.bodyBeforeEmail}{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.{' '}
          {config.contact.bodyAfterEmail}
        </p>
      </section>
    </div>
  );
};

export default FuneralHomePage;
