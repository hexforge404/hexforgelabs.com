import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/apiBase';
import ImagePicker from './ImagePicker';
import ProductPicker from './ProductPicker';
import './LandingPageEditor.css';

const EMPTY_CONFIG = {
  hero: {
    headline: '',
    subheadline: '',
    ctaText: '',
    ctaLink: '',
    secondaryCtaText: '',
    secondaryCtaLink: '',
    imageUrl: '',
    imageAlt: '',
  },
  announcement: {
    enabled: false,
    text: '',
    link: '',
  },
  featuredImages: [],
  reviews: [],
  featuredProductSlugs: [],
  trustBadges: [],
  seo: {
    title: '',
    description: '',
  },
};

const suggestedImageCards = [
  {
    path: '/images/products/litho-multipanel/hero-main.jpg',
    label: 'Litho multipanel hero',
  },
  {
    path: '/images/products/litho-multipanel/hero-alt.jpg',
    label: 'Warm ambient lamp',
  },
  {
    path: '/images/products/litho-multipanel/panel-1.jpg',
    label: 'Close-up panel',
  },
  {
    path: '/images/products/litho-multipanel/panel-2.jpg',
    label: 'Side view',
  },
  {
    path: '/images/products/litho-cylinder/hero-main.jpg',
    label: 'Cylinder lamp',
  },
];

const normalizeConfig = (config) => ({
  hero: { ...EMPTY_CONFIG.hero, ...(config?.hero || {}) },
  announcement: { ...EMPTY_CONFIG.announcement, ...(config?.announcement || {}) },
  featuredImages: Array.isArray(config?.featuredImages)
    ? config.featuredImages.map((item) => ({
        imageUrl: item?.imageUrl || '',
        alt: item?.alt || '',
        caption: item?.caption || '',
        enabled: item?.enabled || false,
        sortOrder: item?.sortOrder ?? 0,
      }))
    : [],
  reviews: Array.isArray(config?.reviews)
    ? config.reviews.map((item) => ({
        name: item?.name || '',
        text: item?.text || '',
        rating: item?.rating ?? 5,
        imageUrl: item?.imageUrl || '',
        enabled: item?.enabled || false,
        sortOrder: item?.sortOrder ?? 0,
      }))
    : [],
  featuredProductSlugs: Array.isArray(config?.featuredProductSlugs) ? [...config.featuredProductSlugs] : [],
  trustBadges: Array.isArray(config?.trustBadges)
    ? config.trustBadges.map((item) => ({
        title: item?.title || '',
        description: item?.description || '',
        icon: item?.icon || '',
        enabled: item?.enabled || false,
        sortOrder: item?.sortOrder ?? 0,
      }))
    : [],
  seo: { ...EMPTY_CONFIG.seo, ...(config?.seo || {}) },
});

const getErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (error.response?.data?.error) return error.response.data.error;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return String(error);
};

const formatDateTime = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
};

const buildEmptyFeaturedImage = (order = 0) => ({
  imageUrl: '',
  alt: '',
  caption: '',
  enabled: true,
  sortOrder: order,
});

const buildEmptyReview = (order = 0) => ({
  name: '',
  text: '',
  rating: 5,
  imageUrl: '',
  enabled: true,
  sortOrder: order,
});

const buildEmptyTrustBadge = (order = 0) => ({
  title: '',
  description: '',
  icon: '',
  enabled: true,
  sortOrder: order,
});

const LandingPageEditor = () => {
  const [formState, setFormState] = useState(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState('loading');
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [imagePickerContext, setImagePickerContext] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerMessage, setProductPickerMessage] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setApiStatus('loading');

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/landing-page`, {
        withCredentials: true,
      });
      if (response?.data?.config) {
        setFormState(normalizeConfig(response.data.config));
      } else {
        setFormState(EMPTY_CONFIG);
      }
      setApiStatus('connected');
      setLastLoadedAt(Date.now());
    } catch (err) {
      setError(`Could not load landing page settings. ${getErrorMessage(err)}`);
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/products`, {
        withCredentials: true,
      });
      if (Array.isArray(response.data)) {
        setAvailableProducts(response.data);
      } else {
        setAvailableProducts([]);
        console.warn('Unexpected /admin/products payload', response.data);
      }
    } catch (err) {
      console.warn('Could not load available products', err);
      setAvailableProducts([]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const setHeroField = (field, value) => {
    setFormState((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [field]: value,
      },
    }));
  };

  const setAnnouncementField = (field, value) => {
    setFormState((current) => ({
      ...current,
      announcement: {
        ...current.announcement,
        [field]: value,
      },
    }));
  };

  const setSeoField = (field, value) => {
    setFormState((current) => ({
      ...current,
      seo: {
        ...current.seo,
        [field]: value,
      },
    }));
  };

  const updateListItem = (listName, index, field, value) => {
    setFormState((current) => {
      const next = [...current[listName]];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return {
        ...current,
        [listName]: next,
      };
    });
  };

  const setFeaturedSlugValue = (index, value) => {
    setFormState((current) => {
      const next = [...current.featuredProductSlugs];
      next[index] = value;
      return {
        ...current,
        featuredProductSlugs: next,
      };
    });
  };

  const addProductSlug = (slug) => {
    const normalized = String(slug || '').trim();
    if (!normalized) return;

    setFormState((current) => {
      const duplicate = current.featuredProductSlugs.some(
        (item) => String(item || '').trim().toLowerCase() === normalized.toLowerCase()
      );
      if (duplicate) return current;
      return {
        ...current,
        featuredProductSlugs: [...current.featuredProductSlugs, normalized],
      };
    });
  };

  const addListItem = (listName, template) => {
    setFormState((current) => ({
      ...current,
      [listName]: [...current[listName], template],
    }));
  };

  const removeListItem = (listName, index) => {
    setFormState((current) => ({
      ...current,
      [listName]: current[listName].filter((_, idx) => idx !== index),
    }));
  };

  const addFeaturedPhoto = () => {
    addListItem('featuredImages', buildEmptyFeaturedImage(formState.featuredImages.length));
  };

  const addReview = () => {
    addListItem('reviews', buildEmptyReview(formState.reviews.length));
  };

  const addTrustBadge = () => {
    addListItem('trustBadges', buildEmptyTrustBadge(formState.trustBadges.length));
  };

  const selectSuggestedImage = (imageUrl) => {
    setHeroField('imageUrl', imageUrl);
  };

  const addSlug = () => {
    setFormState((current) => ({
      ...current,
      featuredProductSlugs: [...current.featuredProductSlugs, ''],
    }));
  };

  const openProductPicker = () => {
    setProductPickerMessage('');
    setProductPickerOpen(true);
  };

  const closeProductPicker = () => {
    setProductPickerMessage('');
    setProductPickerOpen(false);
  };

  const handleAddProduct = (product) => {
    if (!product?.slug) return;
    const normalized = String(product.slug || '').trim();
    const duplicate = formState.featuredProductSlugs.some(
      (item) => String(item || '').trim().toLowerCase() === normalized.toLowerCase()
    );

    if (duplicate) {
      setProductPickerMessage('This product is already in the featured list.');
      return;
    }

    addProductSlug(normalized);
    setProductPickerMessage('');
    closeProductPicker();
  };

  const removeSlug = (index) => {
    setFormState((current) => ({
      ...current,
      featuredProductSlugs: current.featuredProductSlugs.filter((_, idx) => idx !== index),
    }));
  };

  const saveConfig = async () => {
    if (!formState) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(`${API_BASE_URL}/admin/landing-page`, formState, {
        withCredentials: true,
      });
      setSuccess('Landing page saved. Refresh the homepage to see changes.');
      setLastSavedAt(Date.now());
      setApiStatus('connected');
    } catch (err) {
      setError(`Save failed: ${getErrorMessage(err)}`);
      setApiStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const buildAltFromUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const filename = url.split('/').pop() || url;
    const withoutExtension = filename.replace(/\.[^.]+$/, '');
    return withoutExtension.replace(/[-_]+/g, ' ').trim();
  };

  const openImagePicker = (context) => {
    setImagePickerContext(context);
  };

  const closeImagePicker = () => {
    setImagePickerContext(null);
  };

  const handleImageSelect = (url) => {
    if (!imagePickerContext) return;

    if (imagePickerContext.type === 'hero') {
      setHeroField('imageUrl', url);
    } else if (imagePickerContext.type === 'featured' && typeof imagePickerContext.index === 'number') {
      setFormState((current) => {
        const next = [...current.featuredImages];
        const existing = next[imagePickerContext.index];
        if (!existing) return current;
        next[imagePickerContext.index] = {
          ...existing,
          imageUrl: url,
          alt: existing.alt || buildAltFromUrl(url),
        };
        return {
          ...current,
          featuredImages: next,
        };
      });
    } else if (imagePickerContext.type === 'featured-new') {
      setFormState((current) => ({
        ...current,
        featuredImages: [
          ...current.featuredImages,
          {
            ...buildEmptyFeaturedImage(current.featuredImages.length),
            imageUrl: url,
            alt: buildAltFromUrl(url),
          },
        ],
      }));
    }

    closeImagePicker();
  };

  const openHomepage = () => {
    window.open('/', '_blank');
  };

  const heroImageUrl = formState.hero.imageUrl || '/images/products/litho-multipanel/hero-main.jpg';
  const heroPreviewTitle = formState.hero.headline || 'Write your homepage headline here';
  const heroPreviewSubtitle = formState.hero.subheadline || 'A short message that helps visitors understand the product quickly.';

  const productMap = useMemo(() => {
    return availableProducts.reduce((current, product) => {
      const slug = String(product.slug || '').trim().toLowerCase();
      if (slug) current[slug] = product;
      return current;
    }, {});
  }, [availableProducts]);

  const formatProductPrice = (product) => {
    if (!product) return '$0.00';
    if (product.priceFormatted) return product.priceFormatted;
    if (typeof product.price === 'number') return `$${product.price.toFixed(2)}`;
    if (typeof product.price === 'string' && product.price.trim()) return product.price;
    return '$0.00';
  };

  const heroSuggestions = useMemo(
    () => suggestedImageCards.filter((item) => item.path !== formState.hero.imageUrl),
    [formState.hero.imageUrl]
  );

  return (
    <div className="landing-page-editor">
      <div className="editor-header">
        <div>
          <h2 className="section-header">Landing Page Editor</h2>
          <p className="editor-intro">
            Use this page to control the homepage hero image, featured photos, reviews, announcement banner, and trust badges without editing code.
          </p>
        </div>
        <div className="editor-actions">
          <button
            type="button"
            className="action-button secondary-button"
            onClick={loadConfig}
            disabled={loading || saving}
          >
            Reload Saved Version
          </button>
          <button
            type="button"
            className="action-button primary-button"
            onClick={saveConfig}
            disabled={saving || loading}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="action-button secondary-button"
            onClick={openHomepage}
          >
            Open Homepage Preview
          </button>
        </div>
      </div>

      <div className="status-card-row">
        <div className="status-card">
          <span className="status-card-label">Homepage API</span>
          <strong>{apiStatus === 'connected' ? 'Connected' : apiStatus === 'loading' ? 'Connecting…' : 'Error'}</strong>
        </div>
        <div className="status-card">
          <span className="status-card-label">Last loaded</span>
          <strong>{formatDateTime(lastLoadedAt)}</strong>
        </div>
        <div className="status-card">
          <span className="status-card-label">Last saved</span>
          <strong>{formatDateTime(lastSavedAt)}</strong>
        </div>
        <div className="status-card status-card-link">
          <button type="button" className="action-button secondary-button" onClick={openHomepage}>
            Open Public Homepage
          </button>
        </div>
      </div>
      {success && (
        <div className="status-message success-message">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="close-button">×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-card">
          <div className="loading-title">Loading landing page settings…</div>
          <div className="loading-line" />
          <div className="loading-line short" />
          <div className="loading-block" />
        </div>
      ) : (
        <>
          {error && (
            <div className="status-card error-card">
              <div className="error-card-title">Could not load landing page settings.</div>
              <p>{error}</p>
              <div className="error-actions">
                <button type="button" className="action-button primary-button" onClick={loadConfig}>
                  Retry
                </button>
                <button type="button" className="action-button secondary-button" onClick={openHomepage}>
                  Open Public Homepage
                </button>
              </div>
              <p className="hint-text">Check backend logs for <code>/api/admin/landing-page</code>.</p>
            </div>
          )}

          <section className="form-section">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">Hero Section</h3>
                <p className="section-description">
                  Update the main homepage headline, buttons, and hero image.
                </p>
              </div>
            </div>
            <div className="hero-editor-grid">
              <div>
                <div className="form-group">
                  <label className="form-label">Headline</label>
                  <input
                    className="form-input"
                    value={formState.hero.headline}
                    onChange={(event) => setHeroField('headline', event.target.value)}
                    placeholder="Turn your favorite photo into a glowing lamp."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subheadline</label>
                  <textarea
                    className="form-input form-textarea"
                    value={formState.hero.subheadline}
                    onChange={(event) => setHeroField('subheadline', event.target.value)}
                    placeholder="Handmade lithophane lamps from your photos."
                  />
                </div>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Primary Button Text</label>
                    <input
                      className="form-input"
                      value={formState.hero.ctaText}
                      onChange={(event) => setHeroField('ctaText', event.target.value)}
                      placeholder="Shop Custom Lamps"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Button Link</label>
                    <input
                      className="form-input"
                      value={formState.hero.ctaLink}
                      onChange={(event) => setHeroField('ctaLink', event.target.value)}
                      placeholder="/store"
                    />
                  </div>
                </div>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Secondary Button Text</label>
                    <input
                      className="form-input"
                      value={formState.hero.secondaryCtaText}
                      onChange={(event) => setHeroField('secondaryCtaText', event.target.value)}
                      placeholder="Get Free Photo Check"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Secondary Button Link</label>
                    <input
                      className="form-input"
                      value={formState.hero.secondaryCtaLink}
                      onChange={(event) => setHeroField('secondaryCtaLink', event.target.value)}
                      placeholder="/chat?intent=photo-check&product=custom-lithophane"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Hero Image URL</label>
                  <input
                    className="form-input"
                    value={formState.hero.imageUrl}
                    onChange={(event) => setHeroField('imageUrl', event.target.value)}
                    placeholder="/images/products/litho-multipanel/hero-main.jpg"
                  />
                  <div className="picker-action-row">
                    <button
                      type="button"
                      className="action-button secondary-button small-button"
                      onClick={() => openImagePicker({ type: 'hero' })}
                    >
                      Choose from Gallery
                    </button>
                  </div>
                  <p className="hint-text">
                    Select from images already uploaded to your storefront. You can still paste an image path manually.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Hero Image Alt Text</label>
                  <input
                    className="form-input"
                    value={formState.hero.imageAlt}
                    onChange={(event) => setHeroField('imageAlt', event.target.value)}
                    placeholder="Multi-panel lithophane lamp glowing softly with a photo design"
                  />
                </div>
              </div>

              <div className="hero-preview-card">
                <div className="hero-preview-image" style={{ backgroundImage: `url(${heroImageUrl})` }}>
                  {!formState.hero.imageUrl && <div className="hero-preview-placeholder">No hero image set</div>}
                </div>
                <div className="hero-preview-copy">
                  <strong>{heroPreviewTitle}</strong>
                  <p>{heroPreviewSubtitle}</p>
                  <div className="hero-preview-buttons">
                    <span className="hero-button primary">{formState.hero.ctaText || 'Primary action'}</span>
                    <span className="hero-button secondary">{formState.hero.secondaryCtaText || 'Secondary action'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="suggested-images-panel">
              <h4>Suggested Images</h4>
              <div className="suggested-image-grid">
                {heroSuggestions.map((suggestion) => (
                  <div key={suggestion.path} className="suggested-image-card">
                    <div className="suggested-image-thumb" style={{ backgroundImage: `url(${suggestion.path})` }} />
                    <div className="suggested-image-info">
                      <p>{suggestion.label}</p>
                      <div className="suggested-image-actions">
                        <button
                          type="button"
                          className="action-button primary-button small-button"
                          onClick={() => selectSuggestedImage(suggestion.path)}
                        >
                          Use as Hero
                        </button>
                        <button
                          type="button"
                          className="action-button secondary-button small-button"
                          onClick={() => {
                            setFormState((current) => ({
                              ...current,
                              featuredImages: [
                                ...current.featuredImages,
                                { ...buildEmptyFeaturedImage(current.featuredImages.length), imageUrl: suggestion.path },
                              ],
                            }));
                          }}
                        >
                          Add to Featured Photos
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">Announcement Banner</h3>
                <p className="section-description">
                  Add a short highlight banner to the top of the homepage.
                </p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group switch-group">
                <label className="form-label">Show announcement banner</label>
                <input
                  type="checkbox"
                  checked={formState.announcement.enabled}
                  onChange={(event) => setAnnouncementField('enabled', event.target.checked)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Announcement text</label>
                <input
                  className="form-input"
                  value={formState.announcement.text}
                  onChange={(event) => setAnnouncementField('text', event.target.value)}
                  placeholder="Now taking Mother’s Day lamp orders"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Announcement link (optional)</label>
                <input
                  className="form-input"
                  value={formState.announcement.link}
                  onChange={(event) => setAnnouncementField('link', event.target.value)}
                  placeholder="/store"
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">Featured Photos</h3>
                <p className="section-description">
                  Pick 3–6 strong product photos for the homepage gallery.
                </p>
              </div>
              <div className="section-card-actions">
                <button
                  type="button"
                  className="action-button secondary-button small-button"
                  onClick={() => openImagePicker({ type: 'featured-new' })}
                >
                  Add Photo from Gallery
                </button>
              </div>
            </div>
            {formState.featuredImages.length === 0 ? (
              <div className="empty-state-card">
                No featured photos yet. Add 3–6 strong product photos for the homepage.
              </div>
            ) : (
              <div className="feature-gallery-grid">
                {formState.featuredImages.map((item, index) => (
                  <div key={`${item.imageUrl}-${index}`} className="feature-card">
                    <div className="feature-card-top">
                      <div className="feature-thumb" style={{ backgroundImage: `url(${item.imageUrl || '/images/products/litho-multipanel/hero-main.jpg'})` }} />
                      <div className="feature-card-actions">
                        <p className="feature-card-label">Display order {index + 1}</p>
                        <button
                          type="button"
                          className="action-button secondary-button small-button"
                          onClick={() => openImagePicker({ type: 'featured', index })}
                        >
                          Choose Image
                        </button>
                        <button
                          type="button"
                          className="action-button danger-button small-button"
                          onClick={() => removeListItem('featuredImages', index)}
                        >
                          Remove from homepage
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Image URL</label>
                      <input
                        className="form-input"
                        value={item.imageUrl}
                        onChange={(event) => updateListItem('featuredImages', index, 'imageUrl', event.target.value)}
                      />
                    </div>
                    <div className="form-row-grid">
                      <div className="form-group">
                        <label className="form-label">Alt text</label>
                        <input
                          className="form-input"
                          value={item.alt}
                          onChange={(event) => updateListItem('featuredImages', index, 'alt', event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Display order</label>
                        <input
                          className="form-input"
                          type="number"
                          value={item.sortOrder}
                          onChange={(event) => updateListItem('featuredImages', index, 'sortOrder', Number(event.target.value))}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Caption</label>
                      <input
                        className="form-input"
                        value={item.caption}
                        onChange={(event) => updateListItem('featuredImages', index, 'caption', event.target.value)}
                      />
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) => updateListItem('featuredImages', index, 'enabled', event.target.checked)}
                      />
                      Show on homepage
                    </label>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="action-button secondary-button"
              onClick={addFeaturedPhoto}
            >
              Add Featured Photo
            </button>
          </section>

          <section className="form-section">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">Customer Reviews</h3>
                <p className="section-description">
                  Use short real customer comments. First name or initials are enough.
                </p>
              </div>
            </div>
            {formState.reviews.length === 0 ? (
              <div className="empty-state-card">
                No reviews added yet. Add customer feedback here when you are ready.
              </div>
            ) : (
              <div className="review-grid">
                {formState.reviews.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="review-card">
                    <div className="review-card-header">
                      <strong>{item.name || 'Unnamed reviewer'}</strong>
                      <button
                        type="button"
                        className="action-button danger-button small-button"
                        onClick={() => removeListItem('reviews', index)}
                      >
                        Remove review
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Comment</label>
                      <textarea
                        className="form-input form-textarea"
                        value={item.text}
                        onChange={(event) => updateListItem('reviews', index, 'text', event.target.value)}
                      />
                    </div>
                    <div className="form-row-grid">
                      <div className="form-group">
                        <label className="form-label">Rating</label>
                        <select
                          className="form-input"
                          value={item.rating}
                          onChange={(event) => updateListItem('reviews', index, 'rating', Number(event.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Image URL (optional)</label>
                        <input
                          className="form-input"
                          value={item.imageUrl}
                          onChange={(event) => updateListItem('reviews', index, 'imageUrl', event.target.value)}
                        />
                      </div>
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) => updateListItem('reviews', index, 'enabled', event.target.checked)}
                      />
                      Show on homepage
                    </label>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="action-button secondary-button"
              onClick={addReview}
            >
              Add Review
            </button>
          </section>

          <section className="form-section">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">Featured Products</h3>
                <p className="section-description">
                  Choose store products to highlight on the homepage. You can still add slugs manually if needed.
                </p>
              </div>
              <div className="section-card-actions">
                <button
                  type="button"
                  className="action-button secondary-button small-button"
                  onClick={openProductPicker}
                >
                  Choose Product
                </button>
                <button
                  type="button"
                  className="action-button secondary-button small-button"
                  onClick={addSlug}
                >
                  Add Slug Manually
                </button>
              </div>
            </div>
            {formState.featuredProductSlugs.length === 0 ? (
              <div className="empty-state-card">
                No featured products yet. Add products from the store or enter slug values manually.
              </div>
            ) : (
              <div className="featured-product-grid">
                {formState.featuredProductSlugs.map((slug, index) => {
                  const normalized = String(slug || '').trim().toLowerCase();
                  const product = productMap[normalized];
                  const thumbnail = product
                    ? product.hero_image_url || product.image || (Array.isArray(product.imageGallery) && product.imageGallery[0]) || '/images/products/litho-cylinder/hero-main.jpg'
                    : '/images/products/litho-cylinder/hero-main.jpg';
                  return (
                    <div key={`${slug}-${index}`} className="featured-product-card">
                      <div className="featured-product-top">
                        <div className="featured-product-thumb" style={{ backgroundImage: `url(${thumbnail})` }} />
                        <div className="featured-product-copy">
                          <strong className="featured-product-title">
                            {product ? product.title || product.name : 'Manual product slug'}
                          </strong>
                          <div className="featured-product-meta">
                            <span className="meta-label">Slug:</span> {slug || <em>empty</em>}
                          </div>
                          {product && (
                            <>
                              <div className="featured-product-meta">
                                <span className="meta-label">Category:</span> {product.category || 'uncategorized'}
                              </div>
                              <div className="featured-product-meta">
                                <span className="meta-label">Price:</span> {formatProductPrice(product)}
                              </div>
                              <div className="featured-product-meta">
                                <span className="meta-label">Status:</span> {product.status || 'unknown'}
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className="action-button danger-button small-button"
                          onClick={() => removeSlug(index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Product slug</label>
                        <input
                          className="form-input"
                          value={slug}
                          onChange={(event) => setFeaturedSlugValue(index, event.target.value)}
                          placeholder="custom-lithophane-lamp-cylinder"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {productPickerMessage && (
              <div className="status-message error-message">
                <span>{productPickerMessage}</span>
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">Trust Badges</h3>
                <p className="section-description">
                  Quick confidence points like Handmade, Free photo review, and Secure checkout.
                </p>
              </div>
            </div>
            {formState.trustBadges.length === 0 ? (
              <div className="empty-state-card">
                No trust badges yet. Add quick buyer confidence points here.
              </div>
            ) : (
              <div className="badge-grid">
                {formState.trustBadges.map((badge, index) => (
                  <div key={`${badge.title}-${index}`} className="badge-card">
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input
                        className="form-input"
                        value={badge.title}
                        onChange={(event) => updateListItem('trustBadges', index, 'title', event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input
                        className="form-input"
                        value={badge.description}
                        onChange={(event) => updateListItem('trustBadges', index, 'description', event.target.value)}
                      />
                    </div>
                    <div className="form-row-grid">
                      <div className="form-group">
                        <label className="form-label">Icon (emoji/text)</label>
                        <input
                          className="form-input"
                          value={badge.icon}
                          onChange={(event) => updateListItem('trustBadges', index, 'icon', event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Display order</label>
                        <input
                          className="form-input"
                          type="number"
                          value={badge.sortOrder}
                          onChange={(event) => updateListItem('trustBadges', index, 'sortOrder', Number(event.target.value))}
                        />
                      </div>
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={badge.enabled}
                        onChange={(event) => updateListItem('trustBadges', index, 'enabled', event.target.checked)}
                      />
                      Show on homepage
                    </label>
                    <button
                      type="button"
                      className="action-button danger-button small-button"
                      onClick={() => removeListItem('trustBadges', index)}
                    >
                      Remove badge
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="action-button secondary-button"
              onClick={addTrustBadge}
            >
              Add Trust Badge
            </button>
          </section>

          <section className="form-section">
            <details className="seo-details" open={seoOpen} onToggle={(event) => setSeoOpen(event.target.open)}>
              <summary className="section-title">Advanced: SEO Settings</summary>
              <p className="section-description">
                These fields control the homepage title and meta description for search engines.
              </p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Homepage title</label>
                  <input
                    className="form-input"
                    value={formState.seo.title}
                    onChange={(event) => setSeoField('title', event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Meta description</label>
                  <textarea
                    className="form-input form-textarea"
                    value={formState.seo.description}
                    onChange={(event) => setSeoField('description', event.target.value)}
                  />
                </div>
              </div>
            </details>
          </section>

          {imagePickerContext && (
            <ImagePicker
              title={
                imagePickerContext.type === 'hero'
                  ? 'Choose Hero Image'
                  : imagePickerContext.type === 'featured'
                  ? 'Choose Featured Photo'
                  : 'Add Featured Photo'
              }
              selectedUrl={
                imagePickerContext.type === 'hero'
                  ? formState.hero.imageUrl
                  : imagePickerContext.type === 'featured' && typeof imagePickerContext.index === 'number'
                  ? formState.featuredImages[imagePickerContext.index]?.imageUrl || ''
                  : ''
              }
              onSelect={handleImageSelect}
              onClose={closeImagePicker}
            />
          )}
          {productPickerOpen && (
            <ProductPicker
              selectedSlugs={formState.featuredProductSlugs}
              onAddProduct={handleAddProduct}
              onClose={closeProductPicker}
            />
          )}

          <div className="editor-actions bottom-actions">
            <button
              type="button"
              className="action-button secondary-button"
              onClick={loadConfig}
              disabled={saving || loading}
            >
              Reload Saved Version
            </button>
            <button
              type="button"
              className="action-button primary-button"
              onClick={saveConfig}
              disabled={saving || loading}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="action-button secondary-button"
              onClick={openHomepage}
            >
              Open Homepage Preview
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LandingPageEditor;
