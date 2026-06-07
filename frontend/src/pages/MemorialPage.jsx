import React from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config';
import '../App.css';

const MemorialPage = () => (
  <div className="memorial-page">
    <section className="memorial-hero">
      <div className="memorial-hero-copy">
        <p className="memorial-eyebrow">HexForge Labs | Memorial Keepsakes</p>
        <h1>A warm photo keepsake made to honor someone you love</h1>
        <p>
          HexForge Labs creates custom photo-based memorial lithophane lamps from family-submitted
          photographs. When lit from inside, the image becomes visible through the printed material,
          creating a soft illuminated portrait or memory scene for home display, remembrance tables, or
          close family gifts.
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
      </div>
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
      <h2>Memorial keepsake packages</h2>
      <div className="memorial-package-grid">
        <article className="memorial-package-card">
          <h3>Single Memorial Lamp</h3>
          <p>
            A personalized lighted keepsake made from one selected photo. Designed for home display or as a
            quiet remembrance piece.
          </p>
          <p className="memorial-package-best-for">
            <strong>Best for:</strong> One primary memorial photo
          </p>
          <Link
            className="memorial-button memorial-button--secondary"
            to="/store/custom-lithophane-lamp-cylinder"
          >
            Request This Option
          </Link>
        </article>

        <article className="memorial-package-card">
          <h3>Family Keepsake Set</h3>
          <p>
            A coordinated set for families who want more than one keepsake for close relatives or different
            rooms.
          </p>
          <p className="memorial-package-best-for">
            <strong>Best for:</strong> Multiple family members or shared remembrance gifts
          </p>
          <Link
            className="memorial-button memorial-button--secondary"
            to="/store/custom-family-lithophane-bundle"
          >
            Ask About Family Sets
          </Link>
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
        <li>Private family images are handled respectfully and are not used for public display without permission.</li>
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

export default MemorialPage;
