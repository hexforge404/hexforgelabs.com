import React from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config';
import '../App.css';

const FuneralHomePage = () => (
  <div className="funeral-home-page">
    <section className="funeral-home-hero">
      <div className="funeral-home-hero-overlay">
        <div className="funeral-home-hero-copy">
          <p className="funeral-home-eyebrow">HexForge Labs Funeral Home Path</p>
          <h1>Thoughtful keepsakes for families who choose a calm memorial tribute</h1>
          <p>
            Offer families a carefully made, optional memorial keepsake created from images they already
            own. Our process is respectful, private, and designed to support families who want a personalized
            keepsake without pressure.
          </p>
          <div className="funeral-home-cta-row">
            <a
              className="primary-button"
              href={`mailto:${SUPPORT_EMAIL}?subject=Funeral Home Sample Packet Request`}
            >
              Request a sample packet
            </a>
            <Link className="secondary-button" to="/store">
              View memorial keepsake options
            </Link>
          </div>
        </div>
      </div>
    </section>

    <section className="funeral-home-section">
      <h2>Support families with an optional memorial offering</h2>
      <p>
        HexForge Labs helps funeral homes present a non-obligatory keepsake option for families who are looking
        for a quiet way to preserve a memory. These are offered as meaningful additions to existing
        arrangements, not as a required service.
      </p>
      <ul>
        <li>Professional, calm presentation for families and referral partners.</li>
        <li>Optional sample packet for directors to review before offering.</li>
        <li>Secure image guidance and discreet fulfillment after a family opts in.</li>
      </ul>
    </section>

    <section className="funeral-home-section">
      <h2>What families can expect</h2>
      <ul>
        <li>Personalized photo keepsakes designed to honor memory and comfort loved ones.</li>
        <li>One-on-one support from our team to answer questions and review options.</li>
        <li>No private customer data is exposed on this page or through the public site.</li>
      </ul>
    </section>

    <section className="funeral-home-section funeral-home-footer">
      <h2>Contact our team</h2>
      <p>
        For funeral home programs, sample packets, or questions about memorial keepsake options, email us at
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or request a packet above.
      </p>
    </section>
  </div>
);

export default FuneralHomePage;
