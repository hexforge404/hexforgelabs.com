import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config';
import { getProductImage, getProductImageFallback } from '../productImageFallbacks';
import { DEFAULT_PLACEHOLDER, resolveImageUrl } from '../utils/resolveImageUrl';
import '../App.css';

const DEFAULT_CONFIG = {
  hero: {
    eyebrow: 'HexForge Labs | Memorial Photo Keepsakes',
    headline: 'Turn a meaningful photo into a warm memorial light',
    introPrimary:
      'A custom memorial lithophane lamp is made from a photo you choose. When the lamp is lit, the image becomes visible through the printed shade, creating a quiet illuminated keepsake for home display, remembrance tables, or close family gifts.',
    introSecondary:
      'Send a photo, tell us what you have in mind, and HexForge Labs will review what will work best before the keepsake is made.',
    primaryCtaText: 'Start a Memorial Keepsake Request',
    primaryCtaLink: '/store/custom-lithophane-lamp-cylinder',
    secondaryCtaText: 'View Keepsake Packages',
    secondaryCtaLink: '#keepsake-packages',
    privacyText:
      'Family photos are handled respectfully and are not used for public display without permission.',
    imageUrl: '/images/products/litho-lamp/multi-lamp-2.jpg',
    imageAlt: 'Warm illuminated lithophane lamps displayed together',
    imageCaption: 'A family photo becomes visible when the keepsake is illuminated.',
  },

  howItWorks: {
    heading: 'How it works',
    steps: [
      'Choose the keepsake style or package that fits your family.',
      'Send your photo or photos with any notes about the person or memory.',
      'HexForge Labs reviews the image and confirms what will work best.',
      'Your memorial keepsake is created, checked, and prepared for delivery or pickup.',
    ],
  },

  packages: {
    heading: 'Memorial keepsake options',
    items: [
      {
        productSlug: 'custom-lithophane-lamp-cylinder',
        title: 'Cylinder Memorial Photo Lamp',
        description:
          'A custom cylindrical lithophane lamp made from one selected memorial photo. When lit from inside, the image becomes a warm illuminated keepsake.',
        bestFor: 'One primary memorial photo or portrait',
        imageAlt: 'Illuminated cylindrical lithophane lamp',
        buttonText: 'View Cylinder Lamp',
        buttonLink: '/store/custom-lithophane-lamp-cylinder',
        statusText: '',
        availabilityOption: '',
      },
      {
        productSlug: 'lithophane-box',
        title: 'Four-Sided Lithophane Box',
        description:
          'A four-sided photo box that glows from within using an LED tea light or e-tealight. Designed for a shelf, table, or remembrance space.',
        bestFor: 'Small memorial displays, gift pieces, or candle-style remembrance',
        imageAlt: 'Four-sided illuminated lithophane box',
        buttonText: 'View Four-Sided Box',
        buttonLink: '/store/lithophane-box',
        statusText: '',
        availabilityOption: '',
      },
      {
        productSlug: 'five-sided-lithophane-panel-box',
        title: 'Five-Sided Lithophane Panel Box',
        description:
          'A premium five-sided box concept with removable colored lithophane panels.',
        bestFor: 'Future premium custom-panel keepsake displays',
        imageAlt: 'Lithophane panel box concept',
        buttonText: 'Ask About Availability',
        buttonLink: '',
        statusText: 'Coming Soon',
        availabilityOption: 'Five-Sided Lithophane Panel Box',
      },
      {
        productSlug: 'multi-panel-lithophane-lamp',
        title: 'Multi-Panel Lithophane Lamp',
        description:
          'A full lamp shade made with multiple lithophane panels. Each lamp can include up to five panels or photos.',
        bestFor: 'Several photos in one larger lamp or family memorial display',
        imageAlt: 'Full multi-panel lithophane lamp shade',
        buttonText: 'View Multi-Panel Lamp',
        buttonLink: '/store/multi-panel-lithophane-lamp',
        statusText: '',
        availabilityOption: '',
      },
      {
        productSlug: 'lithophane-globe-lamp',
        title: 'Memorial Globe Lamp',
        description:
          'A globe-style illuminated photo keepsake option for families who want a decorative memorial piece.',
        bestFor: 'Decorative home display or a distinctive memorial lamp',
        imageAlt: 'Globe-style illuminated lithophane keepsake',
        buttonText: 'View Globe Lamp',
        buttonLink: '/store/lithophane-globe-lamp',
        statusText: '',
        availabilityOption: '',
      },
      {
        productSlug: 'custom-family-lithophane-bundle',
        title: 'Family Keepsake Bundle',
        description:
          'A coordinated family bundle with matching illuminated keepsakes made from a shared photo set.',
        bestFor: 'Close relatives or several remembrance displays',
        imageAlt: 'Coordinated family lithophane keepsake bundle',
        buttonText: 'View Family Bundle',
        buttonLink: '/store/custom-family-lithophane-bundle',
        statusText: '',
        availabilityOption: '',
      },
    ],
  },

  photoGuidance: {
    heading: 'Photo guidance',
    body:
      'Most clear, well-lit photos can be reviewed for use. If a photo is older, faded, cropped, or low-resolution, HexForge Labs will review it and explain what is possible before moving forward.',
    tips: [
      'Phone photos, scanned photos, and older family images may be reviewed.',
      'Higher contrast and clear faces usually work best.',
      'We will explain what is possible before your keepsake moves into production.',
    ],
  },

  optionalKeepsake: {
    heading: 'A respectful optional keepsake',
    body:
      'These memorial keepsakes are optional personal items. They are not meant to replace flowers, printed materials, urns, or existing funeral home services. They are simply one way for a family to preserve a photo memory in a warm, physical form.',
  },

  contact: {
    heading: 'Start a request',
    bodyBeforeEmail: 'If the request buttons do not work for you, email',
    bodyAfterEmail:
      'with your name, the keepsake option you are interested in, and whether you already have a photo selected.',
  },

  seo: {
    title: 'Memorial Photo Keepsakes | HexForge Labs',
    description:
      'Custom photo memorial lithophane lamps and illuminated keepsakes from HexForge Labs.',
  },
};

const mergeConfig = (incoming = {}) => ({
  hero: {
    ...DEFAULT_CONFIG.hero,
    ...(incoming.hero || {}),
  },

  howItWorks: {
    ...DEFAULT_CONFIG.howItWorks,
    ...(incoming.howItWorks || {}),
    steps:
      Array.isArray(incoming.howItWorks?.steps) && incoming.howItWorks.steps.length
        ? incoming.howItWorks.steps
        : DEFAULT_CONFIG.howItWorks.steps,
  },

  packages: {
    ...DEFAULT_CONFIG.packages,
    ...(incoming.packages || {}),
    items: DEFAULT_CONFIG.packages.items.map((defaultItem, index) => ({
      ...defaultItem,
      ...(Array.isArray(incoming.packages?.items)
        ? incoming.packages.items[index] || {}
        : {}),
      productSlug: defaultItem.productSlug,
      availabilityOption: defaultItem.availabilityOption,
    })),
  },

  photoGuidance: {
    ...DEFAULT_CONFIG.photoGuidance,
    ...(incoming.photoGuidance || {}),
    tips:
      Array.isArray(incoming.photoGuidance?.tips) && incoming.photoGuidance.tips.length
        ? incoming.photoGuidance.tips
        : DEFAULT_CONFIG.photoGuidance.tips,
  },

  optionalKeepsake: {
    ...DEFAULT_CONFIG.optionalKeepsake,
    ...(incoming.optionalKeepsake || {}),
  },

  contact: {
    ...DEFAULT_CONFIG.contact,
    ...(incoming.contact || {}),
  },

  seo: {
    ...DEFAULT_CONFIG.seo,
    ...(incoming.seo || {}),
  },
});

const availabilityHref = (option) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Memorial Keepsake Availability: ${option}`
  )}`;

const productImage = (product, slug) =>
  resolveImageUrl(getProductImage(product || { slug }));

const MemorialPage = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [productsBySlug, setProductsBySlug] = useState({});

  useEffect(() => {
    let active = true;

    fetch('/api/landing-page/memorial')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        if (data?.success && data?.config) {
          setConfig(mergeConfig(data.config));
        }
      })
      .catch((error) => {
        console.warn('Memorial page config is using local defaults:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch('/api/products')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const products = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
        setProductsBySlug(
          products.reduce((result, product) => {
            if (product?.slug) result[product.slug] = product;
            return result;
          }, {})
        );
      })
      .catch((error) => {
        console.warn('Memorial product images are using local fallbacks:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const getMemorialImage = (slug) =>
    productImage(productsBySlug[slug], slug);

  const handleMemorialImageError = (event, slug) => {
    const fallback = resolveImageUrl(getProductImageFallback(slug));

    if (
      fallback &&
      event.currentTarget.src !== new URL(fallback, window.location.origin).href
    ) {
      event.currentTarget.src = fallback;
      return;
    }

    event.currentTarget.src = DEFAULT_PLACEHOLDER;
  };

  const handleHeroImageError = (event) => {
    const fallback = resolveImageUrl(DEFAULT_CONFIG.hero.imageUrl);

    if (
      fallback &&
      event.currentTarget.src !== new URL(fallback, window.location.origin).href
    ) {
      event.currentTarget.src = fallback;
      return;
    }

    event.currentTarget.src = DEFAULT_PLACEHOLDER;
  };

  return (
    <div className="memorial-page">
      <section className="memorial-hero">
        <div className="memorial-hero-copy">
          <p className="memorial-eyebrow">{config.hero.eyebrow}</p>
          <h1>{config.hero.headline}</h1>
          <p>{config.hero.introPrimary}</p>
          <p>{config.hero.introSecondary}</p>

          <div className="memorial-cta-row">
            <Link
              className="memorial-button memorial-button--primary"
              to={config.hero.primaryCtaLink}
            >
              {config.hero.primaryCtaText}
            </Link>

            <a
              className="memorial-button memorial-button--secondary"
              href={config.hero.secondaryCtaLink}
            >
              {config.hero.secondaryCtaText}
            </a>
          </div>

          <p className="memorial-privacy-note">{config.hero.privacyText}</p>
        </div>

        <figure className="memorial-hero-visual">
          <img
            src={resolveImageUrl(config.hero.imageUrl)}
            alt={config.hero.imageAlt}
            onError={handleHeroImageError}
          />
          <figcaption>{config.hero.imageCaption}</figcaption>
        </figure>
      </section>

      <section className="memorial-section">
        <h2>{config.howItWorks.heading}</h2>
        <ol>
          {config.howItWorks.steps.map((step, index) => (
            <li key={`${index}-${step}`}>{step}</li>
          ))}
        </ol>
      </section>

      <section id="keepsake-packages" className="memorial-section">
        <h2>{config.packages.heading}</h2>

        <div className="memorial-package-grid">
          {config.packages.items.map((item) => {
            const usesAvailability = Boolean(item.availabilityOption);

            return (
              <article
                key={item.productSlug}
                className={`memorial-package-card${
                  item.statusText ? ' memorial-package-card--coming-soon' : ''
                }`}
              >
                {item.statusText && (
                  <div className="memorial-package-status">
                    {item.statusText}
                  </div>
                )}

                <img
                  className="memorial-package-image"
                  src={getMemorialImage(item.productSlug)}
                  alt={item.imageAlt}
                  onError={(event) =>
                    handleMemorialImageError(event, item.productSlug)
                  }
                />

                <div className="memorial-package-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>

                  <p className="memorial-package-best-for">
                    <strong>Best for:</strong> {item.bestFor}
                  </p>

                  {usesAvailability ? (
                    <a
                      className="memorial-button memorial-button--secondary"
                      href={availabilityHref(item.availabilityOption)}
                    >
                      {item.buttonText}
                    </a>
                  ) : (
                    <Link
                      className="memorial-button memorial-button--secondary"
                      to={item.buttonLink}
                    >
                      {item.buttonText}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="memorial-section">
        <h2>{config.photoGuidance.heading}</h2>
        <p>{config.photoGuidance.body}</p>
        <ul>
          {config.photoGuidance.tips.map((tip, index) => (
            <li key={`${index}-${tip}`}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="memorial-section">
        <h2>{config.optionalKeepsake.heading}</h2>
        <p>{config.optionalKeepsake.body}</p>
      </section>

      <section className="memorial-section memorial-contact">
        <h2>{config.contact.heading}</h2>
        <p>
          {config.contact.bodyBeforeEmail}{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{' '}
          {config.contact.bodyAfterEmail}
        </p>
      </section>
    </div>
  );
};

export default MemorialPage;
