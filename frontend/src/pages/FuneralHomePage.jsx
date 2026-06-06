import React from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config';
import '../App.css';

const FuneralHomePage = () => (
  <div className="funeral-home-page">
    <section className="funeral-home-hero">
      <div className="funeral-home-hero-overlay">
        <div className="funeral-home-hero-copy">
          <p className="funeral-home-eyebrow">HexForge Labs | Funeral Home Referral Path</p>
          <h1>A respectful local keepsake option for families</h1>
          <p>
            HexForge Labs creates custom photo-based memorial lithophane lamps from family-submitted
            photographs. Each piece is made as a warm, lighted keepsake families can display at home, place
            on a remembrance table when appropriate, or give to close relatives after a service.
          </p>
          <div className="funeral-home-cta-row">
            <a
              className="funeral-home-button funeral-home-button--primary"
              href={`mailto:${SUPPORT_EMAIL}?subject=Funeral Home Info Packet Request`}
            >
              Request Funeral Home Info Packet
            </a>
            <Link className="funeral-home-button funeral-home-button--secondary" to="/memorial">
              View Memorial Keepsake Options
            </Link>
          </div>
        </div>
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
      <ul>
        <li>Optional resource for families who want something personal, photo-based, handmade, and lasting.</li>
        <li>Families work directly with HexForge Labs after they choose to inquire.</li>
        <li>No inventory, commission structure, or vendor commitment is required for the first conversation.</li>
      </ul>
    </section>

    <section className="funeral-home-section">
      <h2>What the memorial keepsake is</h2>
      <p>
        A memorial lithophane lamp is a custom lamp shade, panel, globe, or night-light style piece made from
        a photograph. When lit from inside with LED lighting, the image becomes visible through the printed
        material and creates a soft illuminated portrait or memory scene.
      </p>
      <ul>
        <li>Made from family-submitted photos.</li>
        <li>
          Designed as an optional remembrance item, not a replacement for flowers, printed materials, or
          existing services.
        </li>
        <li>Suitable for home display, remembrance tables when appropriate, or keepsake gifts for close family.</li>
      </ul>
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
        Funeral directors who want to evaluate the process firsthand may request a limited personal sample.
        Send one or two personal photos, experience the same guidance a family would receive, and receive a
        personal keepsake sample to review quality, presentation, and fit before sharing the option with
        families.
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
