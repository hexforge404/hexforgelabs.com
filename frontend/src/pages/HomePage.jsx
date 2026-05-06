import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const featuredProducts = [
  {
    title: 'Custom Lithophane Cylinder Lamp',
    price: '$35',
    subtitle: 'Photo-lit cylinder lamp with a warm, ambient glow.',
    slug: 'custom-lithophane-lamp-cylinder',
    image: '/images/products/litho-cylinder/hero-main.jpg'
  },
  {
    title: 'Lithophane Night Light',
    price: '$10',
    subtitle: 'A compact glow for bedside tables and small spaces.',
    slug: 'lithophane-night-light',
    image: '/images/products/litho-lamp/glow-close.jpg'
  },
  {
    title: 'Multi-panel Lithophane Lamp',
    price: '$55',
    subtitle: 'Multiple photo panels for a richer keepsake display.',
    slug: 'multi-panel-lithophane-lamp',
    image: '/images/products/litho-multipanel/hero-main.jpg'
  },
  {
    title: 'Lithophane Keepsake Box',
    price: '$45',
    subtitle: 'A glowing storage box with custom photo panels.',
    slug: 'lithophane-box',
    image: '/images/products/litho-box/hero-main.jpg'
  }
];

const workflowSteps = [
  {
    title: 'Upload your photo',
    description: 'Choose the image you want to turn into a glowing custom lamp.'
  },
  {
    title: 'Choose your lamp style',
    description: 'Pick a cylinder lamp, night light, multi-panel design, or keepsake box.'
  },
  {
    title: 'We review and craft',
    description: 'Our team checks your photo for contrast, detail, and fit, then handcrafts your lamp.'
  }
];

const galleryCards = [
  {
    title: 'Soft family glow',
    copy: 'A meaningful centerpiece for everyday memories.',
    image: '/images/products/litho-lamp/hero-alt.jpg'
  },
  {
    title: 'Photo-lit heirlooms',
    copy: 'Custom lamps that feel personal and gift-ready.',
    image: '/images/products/litho-box/glow-close.jpg'
  },
  {
    title: 'Bedroom night lights',
    copy: 'Warm, custom lighting for nurseries and bedrooms.',
    image: '/images/products/litho-lamp/panel-baby.jpg'
  },
  {
    title: 'Multi-photo displays',
    copy: 'A richer keepsake with multiple images and warm glow.',
    image: '/images/products/litho-multipanel/panel-3.jpg'
  }
];

const featureHighlights = [
  'Handmade lithophane lamps made from your photos.',
  'Free photo review by our team before production.',
  'Secure checkout and ready-to-ship packaging.',
  'Custom lighting for gifts, memorials, and keepsakes.'
];

const HomePage = () => (
  <main className="home-page">
    <section className="home-hero">
      <div className="hero-copy">
        <small>Custom Photo Lamps Made From Your Memories</small>
        <h1>Turn your favorite photo into a glowing lamp.</h1>
        <p>
          Handmade lithophane lamps, night lights, and keepsake boxes created from your own images. Every order includes a free photo check so your custom light looks great when lit.
        </p>
        <div className="hero-actions">
          <Link to="/store" className="home-primary-cta">
            Shop Custom Lamps
          </Link>
          <Link to="/chat?intent=photo-check&product=custom-lithophane" className="home-secondary-cta">
            Get Free Photo Check
          </Link>
        </div>
        <div className="trust-strip">
          <div className="trust-pill"><span>Handmade to order</span></div>
          <div className="trust-pill"><span>Photo review included</span></div>
          <div className="trust-pill"><span>Secure checkout</span></div>
          <div className="trust-pill"><span>Ships ready to gift</span></div>
          <div className="trust-pill"><span>Built by HexForge Labs</span></div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="lamp-frame">
          <div className="lamp-glow" />
          <div className="lamp-panel">
            <div className="lamp-texture" />
          </div>
          <div className="lamp-base" />
        </div>
      </div>
    </section>

    <section className="featured-products">
      <h2 className="section-title">Featured custom lamp designs</h2>
      <p className="section-copy">
        Choose the right custom lamp for your photo and space. Every model is designed to highlight your image with warm, even illumination.
      </p>
      <div className="product-grid">
        {featuredProducts.map((item) => (
          <Link key={item.slug} to={`/store/${item.slug}`} className="product-card">
            <img className="product-card-image" src={item.image} alt={item.title} />
            <div>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
            </div>
            <div className="product-price">{item.price}</div>
          </Link>
        ))}
      </div>
    </section>

    <section className="how-it-works">
      <h2 className="section-title">How it works</h2>
      <p className="section-copy">
        A straightforward custom lamp process: upload your photo, choose a style, and we handle the review, printing, and shipping.
      </p>
      <div className="how-grid">
        {workflowSteps.map((step, index) => (
          <div key={step.title} className="how-step">
            <h4>{index + 1}. {step.title}</h4>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="gallery-section">
      <h2 className="section-title">Real photo lamp examples</h2>
      <p className="section-copy">
        See how custom photos become warm, glowing displays for living rooms, bedrooms, and gift-ready keepsakes.
      </p>
      <div className="gallery-grid">
        {galleryCards.map((item) => (
          <div
            key={item.title}
            className="gallery-card"
            style={{ backgroundImage: `url(${item.image})` }}
          >
            <div className="gallery-card-overlay">
              <h4>{item.title}</h4>
              <p>{item.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="why-section">
      <h2 className="section-title">Why choose HexForge lamps?</h2>
      <div className="feature-grid">
        {featureHighlights.map((item) => (
          <div key={item} className="feature-card">
            <p>{item}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="final-cta">
      <div className="final-cta-content">
        <div>
          <h2>Ready to make a photo-lit keepsake?</h2>
          <p className="section-copy">
            Start your order or send your photo for a free review and we’ll make sure it works beautifully as a custom lamp.
          </p>
        </div>
        <div className="final-cta-actions">
          <Link to="/store" className="home-primary-cta">
            Browse Custom Lamps
          </Link>
          <Link to="/chat?intent=photo-check&product=custom-lithophane" className="home-secondary-cta">
            Get Free Photo Check
          </Link>
        </div>
      </div>
    </section>
  </main>
);

export default HomePage;

