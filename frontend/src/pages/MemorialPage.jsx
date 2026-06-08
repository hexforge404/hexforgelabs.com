import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config';
import { getProductImage, getProductImageFallback } from '../productImageFallbacks';
import { DEFAULT_PLACEHOLDER, resolveImageUrl } from '../utils/resolveImageUrl';
import '../App.css';

const availabilityHref = (option) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Memorial Keepsake Availability: ${option}`
  )}`;

const productImage = (product, slug) =>
  resolveImageUrl(getProductImage(product || { slug }));

const MemorialPage = () => {
  const [productsBySlug, setProductsBySlug] = useState({});

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

  const getMemorialImage = (slug) => productImage(productsBySlug[slug], slug);

  const handleMemorialImageError = (event, slug) => {
    const fallback = resolveImageUrl(getProductImageFallback(slug));
    if (fallback && event.currentTarget.src !== new URL(fallback, window.location.origin).href) {
      event.currentTarget.src = fallback;
      return;
    }
    event.currentTarget.src = DEFAULT_PLACEHOLDER;
  };

  return (
  <div className="memorial-page">
    <section className="memorial-hero">
      <div className="memorial-hero-copy">
        <p className="memorial-eyebrow">HexForge Labs | Memorial Photo Keepsakes</p>
        <h1>Turn a meaningful photo into a warm memorial light</h1>
        <p>
          A custom memorial lithophane lamp is made from a photo you choose. When the lamp is lit, the image
          becomes visible through the printed shade, creating a quiet illuminated keepsake for home display,
          remembrance tables, or close family gifts.
        </p>
        <p>
          Send a photo, tell us what you have in mind, and HexForge Labs will review what will work best
          before the keepsake is made.
        </p>
        <div className="memorial-cta-row">
          <Link
            className="memorial-button memorial-button--primary"
            to="/store/custom-lithophane-lamp-cylinder"
          >
            Start a Memorial Keepsake Request
          </Link>
          <a className="memorial-button memorial-button--secondary" href="#keepsake-packages">
            View Keepsake Packages
          </a>
        </div>
        <p className="memorial-privacy-note">
          Family photos are handled respectfully and are not used for public display without permission.
        </p>
      </div>
      <figure className="memorial-hero-visual">
        <img
          src="/images/products/litho-lamp/multi-lamp-2.jpg"
          alt="Warm illuminated lithophane lamps displayed together"
        />
        <figcaption>A family photo becomes visible when the keepsake is illuminated.</figcaption>
      </figure>
    </section>

    <section className="memorial-section">
      <h2>How it works</h2>
      <ol>
        <li>Choose the keepsake style or package that fits your family.</li>
        <li>Send your photo or photos with any notes about the person or memory.</li>
        <li>HexForge Labs reviews the image and confirms what will work best.</li>
        <li>Your memorial keepsake is created, checked, and prepared for delivery or pickup.</li>
      </ol>
    </section>

    <section id="keepsake-packages" className="memorial-section">
      <h2>Memorial keepsake options</h2>
      <div className="memorial-package-grid">
        <article className="memorial-package-card">
          <img
            className="memorial-package-image"
            src={getMemorialImage('custom-lithophane-lamp-cylinder')}
            alt="Illuminated cylindrical lithophane lamp"
            onError={(event) => handleMemorialImageError(event, 'custom-lithophane-lamp-cylinder')}
          />
          <div className="memorial-package-card-body">
            <h3>Cylinder Memorial Photo Lamp</h3>
            <p>
              A custom cylindrical lithophane lamp made from one selected memorial photo. When lit from
              inside, the image becomes a warm illuminated keepsake.
            </p>
            <p className="memorial-package-best-for">
              <strong>Best for:</strong> One primary memorial photo or portrait
            </p>
            <Link
              className="memorial-button memorial-button--secondary"
              to="/store/custom-lithophane-lamp-cylinder"
            >
              View Cylinder Lamp
            </Link>
          </div>
        </article>

        <article className="memorial-package-card">
          <img
            className="memorial-package-image"
            src={getMemorialImage('lithophane-box')}
            alt="Four-sided illuminated lithophane box"
            onError={(event) => handleMemorialImageError(event, 'lithophane-box')}
          />
          <div className="memorial-package-card-body">
            <h3>Four-Sided Lithophane Box</h3>
            <p>
              A four-sided photo box that glows from within using an LED tea light or e-tealight. Designed
              for a shelf, table, or remembrance space.
            </p>
            <p className="memorial-package-best-for">
              <strong>Best for:</strong> Small memorial displays, gift pieces, or candle-style remembrance
            </p>
            <Link
              className="memorial-button memorial-button--secondary"
              to="/store/lithophane-box"
            >
              View Four-Sided Box
            </Link>
          </div>
        </article>

        <article className="memorial-package-card memorial-package-card--coming-soon">
          <div className="memorial-package-status">Coming Soon</div>
          <img
            className="memorial-package-image"
            src={getMemorialImage('five-sided-lithophane-panel-box')}
            alt="Lithophane panel box concept"
            onError={(event) => handleMemorialImageError(event, 'five-sided-lithophane-panel-box')}
          />
          <div className="memorial-package-card-body">
            <h3>Five-Sided Lithophane Panel Box</h3>
            <p>A premium five-sided box concept with removable colored lithophane panels.</p>
            <p className="memorial-package-best-for">
              <strong>Best for:</strong> Future premium custom-panel keepsake displays
            </p>
            <a
              className="memorial-button memorial-button--secondary"
              href={availabilityHref('Five-Sided Lithophane Panel Box')}
            >
              Ask About Availability
            </a>
          </div>
        </article>

        <article className="memorial-package-card">
          <img
            className="memorial-package-image"
            src={getMemorialImage('multi-panel-lithophane-lamp')}
            alt="Full multi-panel lithophane lamp shade"
            onError={(event) => handleMemorialImageError(event, 'multi-panel-lithophane-lamp')}
          />
          <div className="memorial-package-card-body">
            <h3>Multi-Panel Lithophane Lamp</h3>
            <p>
              A full lamp shade made with multiple lithophane panels. Each lamp can include up to five
              panels or photos.
            </p>
            <p className="memorial-package-best-for">
              <strong>Best for:</strong> Several photos in one larger lamp or family memorial display
            </p>
            <Link
              className="memorial-button memorial-button--secondary"
              to="/store/multi-panel-lithophane-lamp"
            >
              View Multi-Panel Lamp
            </Link>
          </div>
        </article>

        <article className="memorial-package-card">
          <img
            className="memorial-package-image"
            src={getMemorialImage('lithophane-globe-lamp')}
            alt="Globe-style illuminated lithophane keepsake"
            onError={(event) => handleMemorialImageError(event, 'lithophane-globe-lamp')}
          />
          <div className="memorial-package-card-body">
            <h3>Memorial Globe Lamp</h3>
            <p>
              A globe-style illuminated photo keepsake option for families who want a decorative memorial
              piece.
            </p>
            <p className="memorial-package-best-for">
              <strong>Best for:</strong> Decorative home display or a distinctive memorial lamp
            </p>
            <Link
              className="memorial-button memorial-button--secondary"
              to="/store/lithophane-globe-lamp"
            >
              View Globe Lamp
            </Link>
          </div>
        </article>

        <article className="memorial-package-card">
          <img
            className="memorial-package-image"
            src={getMemorialImage('custom-family-lithophane-bundle')}
            alt="Coordinated family lithophane keepsake bundle"
            onError={(event) => handleMemorialImageError(event, 'custom-family-lithophane-bundle')}
          />
          <div className="memorial-package-card-body">
            <h3>Family Keepsake Bundle</h3>
            <p>
              A coordinated family bundle with matching illuminated keepsakes made from a shared photo set.
            </p>
            <p className="memorial-package-best-for">
              <strong>Best for:</strong> Close relatives or several remembrance displays
            </p>
            <Link
              className="memorial-button memorial-button--secondary"
              to="/store/custom-family-lithophane-bundle"
            >
              View Family Bundle
            </Link>
          </div>
        </article>
      </div>
    </section>

    <section className="memorial-section">
      <h2>Photo guidance</h2>
      <p>
        Most clear, well-lit photos can be reviewed for use. If a photo is older, faded, cropped, or
        low-resolution, HexForge Labs will review it and explain what is possible before moving forward.
      </p>
      <ul>
        <li>Phone photos, scanned photos, and older family images may be reviewed.</li>
        <li>Higher contrast and clear faces usually work best.</li>
        <li>We will explain what is possible before your keepsake moves into production.</li>
      </ul>
    </section>

    <section className="memorial-section">
      <h2>A respectful optional keepsake</h2>
      <p>
        These memorial keepsakes are optional personal items. They are not meant to replace flowers, printed
        materials, urns, or existing funeral home services. They are simply one way for a family to preserve
        a photo memory in a warm, physical form.
      </p>
    </section>

    <section className="memorial-section memorial-contact">
      <h2>Start a request</h2>
      <p>
        If the request buttons do not work for you, email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your name, the keepsake option you are
        interested in, and whether you already have a photo selected.
      </p>
    </section>
  </div>
  );
};

export default MemorialPage;
