import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const fallbackLandingConfig = {
  hero: {
    headline: 'Turn your favorite photo into a glowing lamp.',
    subheadline: 'Handmade lithophane lamps, night lights, and keepsake boxes created from your own images. Every order includes a free photo check so your custom light looks great when lit.',
    ctaText: 'Shop Custom Lamps',
    ctaLink: '/store',
    secondaryCtaText: 'Get Free Photo Check',
    secondaryCtaLink: '/chat?intent=photo-check&product=custom-lithophane',
    imageUrl: '/images/products/litho-multipanel/hero-main.jpg',
    imageAlt: 'Multi-panel lithophane lamp glowing softly with a photo design',
  },
  announcement: {
    enabled: false,
    text: '',
    link: '',
  },
  featuredImages: [
    {
      imageUrl: '/images/products/litho-multipanel/hero-main.jpg',
      alt: 'Multi-panel lithophane lamp hero image',
      caption: 'Custom multi-panel glow',
      enabled: true,
      sortOrder: 0,
    },
    {
      imageUrl: '/images/products/litho-multipanel/hero-alt.jpg',
      alt: 'Alternate view of a multi-panel lithophane lamp',
      caption: 'Warm ambient lighting',
      enabled: true,
      sortOrder: 1,
    },
    {
      imageUrl: '/images/products/litho-multipanel/panel-1.jpg',
      alt: 'Close-up detail of lithophane panel',
      caption: 'Detailed lithophane panels',
      enabled: true,
      sortOrder: 2,
    },
    {
      imageUrl: '/images/products/litho-multipanel/panel-2.jpg',
      alt: 'Multi-panel lithophane lamp side view',
      caption: 'Multiple photo panels',
      enabled: true,
      sortOrder: 3,
    },
    {
      imageUrl: '/images/products/litho-cylinder/hero-main.jpg',
      alt: 'Cylinder lithophane lamp example',
      caption: 'Cylinder lamp example',
      enabled: true,
      sortOrder: 4,
    },
  ],
  reviews: [],
  featuredProductSlugs: [],
  trustBadges: [
    { title: 'Handmade to order', enabled: true, sortOrder: 0 },
    { title: 'Built from your photos', enabled: true, sortOrder: 1 },
    { title: 'Free photo review', enabled: true, sortOrder: 2 },
    { title: 'Secure checkout', enabled: true, sortOrder: 3 },
  ],
};

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

const fallbackTrustBadges = [
  { title: 'Handmade to order', enabled: true, sortOrder: 0 },
  { title: 'Built from your photos', enabled: true, sortOrder: 1 },
  { title: 'Free photo review', enabled: true, sortOrder: 2 },
  { title: 'Secure checkout', enabled: true, sortOrder: 3 },
];

const fallbackFeaturedProducts = featuredProducts;

const sortByOrder = (items) => [...items].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));

const mergeLandingConfig = (apiConfig) => {
  if (!apiConfig || typeof apiConfig !== 'object') {
    return fallbackLandingConfig;
  }

  const hero = { ...fallbackLandingConfig.hero, ...(apiConfig.hero || {}) };
  const announcement = { ...fallbackLandingConfig.announcement, ...(apiConfig.announcement || {}) };

  const featuredImages = Array.isArray(apiConfig.featuredImages) && apiConfig.featuredImages.length
    ? sortByOrder(apiConfig.featuredImages.filter((item) => item && item.enabled !== false))
    : fallbackLandingConfig.featuredImages;

  const reviews = Array.isArray(apiConfig.reviews)
    ? sortByOrder(apiConfig.reviews.filter((item) => item && item.enabled !== false))
    : [];

  const trustBadges = Array.isArray(apiConfig.trustBadges) && apiConfig.trustBadges.length
    ? sortByOrder(apiConfig.trustBadges.filter((item) => item && item.enabled !== false))
    : fallbackTrustBadges;

  const featuredProductSlugs = Array.isArray(apiConfig.featuredProductSlugs)
    ? apiConfig.featuredProductSlugs.filter((item) => Boolean(item && String(item).trim()))
    : [];

  return {
    hero,
    announcement,
    featuredImages,
    reviews,
    trustBadges,
    featuredProductSlugs,
  };
};

const HomePage = () => {
  const [landingConfig, setLandingConfig] = useState(fallbackLandingConfig);
  const [approvedReviews, setApprovedReviews] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchLandingConfig = async () => {
      try {
        const response = await fetch('/api/landing-page');
        if (!response.ok) {
          throw new Error(`Landing page config request failed: ${response.status}`);
        }

        const data = await response.json();
        if (data?.success && data.config && isMounted) {
          setLandingConfig(mergeLandingConfig(data.config));
        }
      } catch (err) {
        console.warn('Unable to load landing page config:', err);
      }
    };

    fetchLandingConfig();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (landingConfig.reviews && landingConfig.reviews.length > 0) {
      setApprovedReviews([]);
      return () => { isMounted = false; };
    }

    const fetchApprovedReviews = async () => {
      try {
        const response = await fetch('/api/reviews/approved');
        if (!response.ok) {
          throw new Error(`Approved reviews request failed: ${response.status}`);
        }

        const data = await response.json();
        if (data?.success && Array.isArray(data.reviews) && isMounted) {
          const mapped = data.reviews.map((item) => ({
            name: item.customerName || '',
            text: item.reviewText || '',
            rating: item.rating || 0,
            imageUrl: item.imageUrl || '',
            media: Array.isArray(item.media) ? item.media : [],
          }));
          setApprovedReviews(mapped);
        }
      } catch (err) {
        console.warn('Unable to load approved reviews:', err);
      }
    };

    fetchApprovedReviews();

    return () => { isMounted = false; };
  }, [landingConfig.reviews]);

  const heroImageUrl = landingConfig.hero.imageUrl || fallbackLandingConfig.hero.imageUrl;
  const heroImageAlt = landingConfig.hero.imageAlt || fallbackLandingConfig.hero.imageAlt;
  const featuredImages = landingConfig.featuredImages.length ? landingConfig.featuredImages : fallbackLandingConfig.featuredImages;
  const activeReviews = landingConfig.reviews?.length ? landingConfig.reviews : approvedReviews;
  const trustBadges = landingConfig.trustBadges.length ? landingConfig.trustBadges : fallbackTrustBadges;
  const productLinks = landingConfig.featuredProductSlugs.length
    ? fallbackFeaturedProducts.filter((item) => landingConfig.featuredProductSlugs.includes(item.slug))
    : fallbackFeaturedProducts;

  return (
    <main className="home-page">
      {landingConfig.announcement?.enabled && (
        <section className="announcement-banner">
          {landingConfig.announcement.link ? (
            <a href={landingConfig.announcement.link}>{landingConfig.announcement.text}</a>
          ) : (
            <span>{landingConfig.announcement.text}</span>
          )}
        </section>
      )}

      <section className="home-hero">
        <div className="hero-copy">
          <small>Custom Photo Lamps Made From Your Memories</small>
          <h1>{landingConfig.hero.headline}</h1>
          <p>{landingConfig.hero.subheadline}</p>
          <div className="hero-actions">
            <Link to={landingConfig.hero.ctaLink || '/store'} className="home-primary-cta">
              {landingConfig.hero.ctaText || 'Shop Custom Lamps'}
            </Link>
            <Link to={landingConfig.hero.secondaryCtaLink || '/chat?intent=photo-check&product=custom-lithophane'} className="home-secondary-cta">
              {landingConfig.hero.secondaryCtaText || 'Get Free Photo Check'}
            </Link>
          </div>
          <div className="trust-strip">
            {trustBadges.map((badge) => (
              <div key={badge.title} className="trust-pill"><span>{badge.title}</span></div>
            ))}
          </div>
        </div>
        <div className="hero-visual">
          <img
            className="hero-image"
            src={heroImageUrl}
            alt={heroImageAlt}
            onError={(e) => { e.currentTarget.src = fallbackLandingConfig.hero.imageUrl; }}
          />
        </div>
      </section>

      <section className="featured-products">
        <h2 className="section-title">Featured custom lamp designs</h2>
        <p className="section-copy">
          Choose the right custom lamp for your photo and space. Every model is designed to highlight your image with warm, even illumination.
        </p>
        <div className="product-grid">
          {productLinks.map((item) => (
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
          {featuredImages.map((item, index) => (
            <div
              key={`${item.imageUrl || item.title}-${index}`}
              className="gallery-card"
              style={{ backgroundImage: `url(${item.imageUrl || item.image})` }}
            >
              <div className="gallery-card-overlay">
                <h4>{item.caption || item.title}</h4>
                {item.alt && <p>{item.alt}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {activeReviews.length > 0 && (
        <section className="testimonial-section">
          <h2 className="section-title">Customer reviews</h2>
          <div className="testimonial-grid">
            {activeReviews.map((item, index) => {
              const imageUrl = item.imageUrl || item.media?.find((mediaItem) => mediaItem.type === 'image')?.url;
              const videoUrl = item.media?.find((mediaItem) => mediaItem.type === 'video')?.url;
              return (
                <div key={`${item.name}-${index}`} className="testimonial-card">
                  {imageUrl && (
                    <img
                      className="review-image"
                      src={imageUrl}
                      alt={item.name || 'Reviewer image'}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  {!imageUrl && videoUrl && (
                    <video className="review-video" controls src={videoUrl} />
                  )}
                  <p>“{item.text}”</p>
                  <div className="testimonial-author">
                    {item.name}{item.rating ? ` · ${'★'.repeat(Math.max(1, Math.min(5, item.rating)))}${'☆'.repeat(Math.max(0, 5 - item.rating))}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="why-section">
        <h2 className="section-title">Why choose HexForge lamps?</h2>
        <div className="feature-grid">
          {trustBadges.map((item) => (
            <div key={item.title} className="feature-card">
              <p>{item.title}</p>
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
};

export default HomePage;

