import React from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config';
import '../App.css';

const FuneralHomePage = () => (
  <div className="funeral-home-page">
    <section className="funeral-home-hero">
      <div className="funeral-home-hero-overlay">
        <div className="funeral-home-hero-copy">
          <p className="funeral-home-eyebrow">HexForge Labs | Funeral Home Memorial Keepsake Option</p>
          <h1>A simple photo keepsake option for families who ask for something personal</h1>
          <p>
            HexForge Labs creates custom photo-based memorial lithophane lamps from family-submitted
            photographs. When lit from inside, the image becomes a soft illuminated portrait or memory scene
            families can display at home, place on a remembrance table when appropriate, or give to close
            relatives after a service.
          </p>
          <p>
            Families work directly with HexForge Labs for photo review, ordering, payment, and fulfillment.
            Your team can simply share the information sheet or QR code when a family asks about personalized
            keepsakes.
          </p>
          <div className="funeral-home-cta-row">
            <a
              className="funeral-home-button funeral-home-button--primary"
              href={`mailto:${SUPPORT_EMAIL}?subject=Funeral Home Info Packet Request`}
            >
              Request Funeral Home Info Packet
            </a>
            <Link className="funeral-home-button funeral-home-button--secondary" to="/memorial">
              View Family Memorial Page
            </Link>
          </div>
        </div>
        <figure className="funeral-home-hero-visual">
          <img
            src="/images/products/litho-lamp/multi-lamp-2.jpg"
            alt="A group of illuminated custom lithophane lamps"
          />
          <figcaption>
            <strong>Memorial lithophane lamp preview</strong>
            <span>Custom photo keepsakes illuminated from within.</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section className="funeral-home-section">
      <h2>A simple referral path for families who ask about keepsakes</h2>
      <p>
        Funeral homes may share an information sheet or QR code with families who ask about personalized
        memorial keepsakes. Families contact and order directly through HexForge Labs, so your team does not
        need to manage inventory, collect photos, process payments, or add another formal vendor program
        before there is proven interest.
      </p>
      <p className="funeral-home-callout">
        No inventory, photo collection, payment processing, or fulfillment work is required from your team.
      </p>
    </section>

    <section className="funeral-home-section">
      <h2>What families receive</h2>
      <div className="funeral-home-card-grid">
        <article className="funeral-home-info-card">
          <span className="funeral-home-card-number">01</span>
          <h3>Custom photo lamp</h3>
          <p>A family-selected photograph becomes a warm illuminated portrait or memory scene.</p>
        </article>
        <article className="funeral-home-info-card">
          <span className="funeral-home-card-number">02</span>
          <h3>Photo review guidance</h3>
          <p>HexForge Labs reviews the image and explains what will reproduce clearly before production.</p>
        </article>
        <article className="funeral-home-info-card">
          <span className="funeral-home-card-number">03</span>
          <h3>Direct order with HexForge Labs</h3>
          <p>Families handle order details, payment, delivery, or pickup directly with HexForge Labs.</p>
        </article>
      </div>
      <p className="funeral-home-privacy">
        Family photos are handled privately and are not used publicly without permission.
      </p>
    </section>

    <section className="funeral-home-section">
      <h2>How the referral path works</h2>
      <ol>
        <li>
          A funeral home shares the QR code or information sheet when a family asks about personalized
          keepsakes.
        </li>
        <li>The family reviews options and contacts HexForge Labs directly.</li>
        <li>HexForge Labs handles photo guidance, order details, payment, and fulfillment.</li>
        <li>
          The funeral home can request a sample or discuss a display arrangement later if there is interest.
        </li>
      </ol>
    </section>

    <section className="funeral-home-section">
      <h2>Optional director sample</h2>
      <p>
        Limited director samples can be discussed after your team reviews the information packet, especially
        if you want to experience the same photo review and keepsake process a family would receive.
      </p>
    </section>

    <section className="funeral-home-section funeral-home-footer">
      <h2>Contact our team</h2>
      <p>
        For funeral home programs, information packets, sample questions, or display discussions, contact
        HexForge Labs at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Calls or in-person visits are
        available by appointment.
      </p>
    </section>
  </div>
);

export default FuneralHomePage;
