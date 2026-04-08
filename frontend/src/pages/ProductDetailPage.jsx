import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from 'context/CartContext';
import { toast } from 'react-toastify';
import { getProductContent } from '../data/productOverrides';
import { resolveImageUrl, DEFAULT_PLACEHOLDER } from '../utils/resolveImageUrl';
import './ProductDetailPage.css';

function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Custom order form state
  const [customOrder, setCustomOrder] = useState({
    images: [null],
    size: 'medium',
    panels: 'single',
    lightType: 'led',
    notes: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingStreet: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: ''
  });
  const [customOrderResult, setCustomOrderResult] = useState(null);
  const [isSubmittingCustomOrder, setIsSubmittingCustomOrder] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const panelCountMap = {
    single: 1,
    double: 2,
    triple: 3,
    quad: 4,
  };

  const getRequiredPanelCount = (panelValue) => panelCountMap[panelValue] || 1;

  const handlePromoValidation = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    setPromoValidation(null);

    try {
      const response = await fetch('/api/products/custom-orders/validate-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product._id,
          promoCode: promoCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPromoValidation({
          valid: false,
          error: data.error || 'Invalid promo code'
        });
        toast.error(data.error || 'Invalid promo code');
        return;
      }

      setPromoValidation(data);
      toast.success('Promo code applied successfully!');

    } catch (error) {
      console.error('Promo validation error:', error);
      setPromoValidation({
        valid: false,
        error: 'Failed to validate promo code'
      });
      toast.error('Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handlePromoCodeChange = (e) => {
    setPromoCode(e.target.value.toUpperCase());
    // Clear validation when user starts typing
    if (promoValidation) {
      setPromoValidation(null);
    }
  };

  const handlePanelImageUpload = (index, file) => {
    if (!file) return;
    setCustomOrder(prev => {
      const nextImages = [...prev.images];
      nextImages[index] = file;
      return { ...prev, images: nextImages };
    });
  };

  const handleRemovePanelImage = (index) => {
    setCustomOrder(prev => {
      const nextImages = [...prev.images];
      nextImages[index] = null;
      return { ...prev, images: nextImages };
    });
  };

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/slug/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('not-found');
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
          return;
        }
        const data = await res.json();
        setProduct(data);

        // Fetch related products
        if (data.category && data.category !== 'surface') {
          try {
            const relRes = await fetch(`/api/products?category=${encodeURIComponent(data.category)}&limit=10&raw=true`);
            if (relRes.ok) {
              const relData = await relRes.json();
              const related = Array.isArray(relData) ? relData : (Array.isArray(relData.data) ? relData.data : []);
              const filtered = related.filter(p => p._id !== data._id && p.category !== 'surface').slice(0, 3);
              setRelatedProducts(filtered);
            }
          } catch (err) {
            console.error('Error fetching related products:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('general');
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
    }
  }, [product?._id]);

  const getImageSrc = (image) => resolveImageUrl(image);

  const getAvailabilityStatus = (stock, status) => {
    if (status === 'archived' || status === 'draft') {
      return { text: 'Not Available', className: 'out-of-stock' };
    }
    if (stock <= 0) {
      return { text: 'Out of Stock', className: 'out-of-stock' };
    }
    if (stock <= 5) {
      return { text: 'Low Stock', className: 'low-stock' };
    }
    return { text: 'In Stock', className: 'in-stock' };
  };

  const getCategoryLabel = (category) => {
    const categoryMap = {
      'uncategorized': 'Tools & Accessories',
      'hardware': 'Security Hardware',
      'software': 'Operating Systems',
      'security': 'Security Tools',
      'tools': 'Utilities',
      'surface': '3D Models',
      'linux': 'Linux Distributions',
      'os': 'Operating Systems',
      'lamps': 'Custom Lamps & Prints',
      'custom': 'Custom Products',
    };
    return categoryMap[category] || (category ? category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ') : 'Tools & Accessories');
  };

  const getProductHighlights = (prod) => {
    if (prod.category === 'lamps') {
      const highlights = [
        'Handcrafted from your photos',
        'Soft, warm ambient glow',
        'Gift-ready keepsake',
        'Custom sizing and panel options',
      ];
      if (prod.brand) highlights.unshift(`${prod.brand}`);
      return highlights;
    }
    const highlights = [];
    if (prod.brand) highlights.push(`${prod.brand}`);
    if (prod.sku) highlights.push(`Model: ${prod.sku}`);
    if (prod.stock > 10) highlights.push('Ships within 2 business days');
    if (highlights.length === 0) {
      highlights.push('Premium quality product', 'Direct from HexForge');
    }
    return highlights;
  };

  const getUseCasesGenerated = (prod) => {
    const categoryUseCases = {
      hardware: [
        'Red team exercises',
        'Security testing & demonstrations',
        'Authorized assessments',
        'Educational labs'
      ],
      software: ['System administration', 'Development environments', 'Testing & QA', 'Education'],
      'security': [
        'Penetration testing',
        'Vulnerability research',
        'Security assessments',
        'Training & certification prep'
      ],
      'tools': ['Daily operations', 'Automation', 'Custom development', 'Integration'],
      'surface': ['3D visualization', '3D modeling', 'Product design', 'Prototyping'],
      'linux': [
        'Penetration testing',
        'System administration',
        'Security research',
        'Development work'
      ],
      'lamps': [
        'Anniversary & wedding gifts',
        'Family photo keepsakes',
        'Memorial tributes',
        'Cozy home decor'
      ],
    };
    return categoryUseCases[prod.category] || ['Professional use', 'Learning', 'Development', 'Integration'];
  };

  const getWhatsIncludedGenerated = (prod) => {
    const included = [
      prod.title,
      'Documentation & guides',
      'Support contact information',
    ];
    if (prod.brand) included.push(`${prod.brand} support`);
    return included;
  };

  const generateProductDescription = (prod) => {
    const title = prod.title || prod.name || 'Product';
    const categoryDescriptions = {
      'hardware': `Professional-grade hardware security tool designed for authorized testing and research. ${title} is engineered for durability and reliable performance in real-world security assessment scenarios. Built with quality materials and thorough quality assurance to ensure consistent results.`,
      'software': `Comprehensive security software designed for authorized professionals and researchers. ${title} provides systematic assessment capabilities with integrated tools for thorough evaluation. Professional-grade implementation with reliable performance and robust functionality.`,
      'linux': `Security-focused Linux distribution optimized for penetration testing and security research. ${title} combines a carefully-tuned system environment with comprehensive security tools. Designed for authorized professionals and educators conducting security assessments.`,
      'lamps': `Turn your favorite photos into a warm, glowing lithophane lamp that lights up the memories behind it. ${title} is handcrafted to preserve fine detail, designed to feel premium, and made to gift, display, and treasure for years. Choose your size, panel count, and lighting for a truly personal keepsake.`,
    };
    const defaultDesc = `Premium professional-grade tool from HexForge Labs. ${title} delivers quality and reliability for security professionals and authorized researchers. Built with attention to detail and thoroughly tested for consistent performance.`;
    return categoryDescriptions[prod.category] || defaultDesc;
  };

  const getTrustIndicators = () => {
    return [
      { icon: '🔨', text: 'Built in-house by cybersecurity experts' },
      { icon: '💬', text: 'Direct support from the HexForge team' },
      { icon: '✓', text: 'Quality assured & tested' },
    ];
  };

  const handleCustomOrderSubmit = async () => {
    const requiredPanels = getRequiredPanelCount(customOrder.panels);
    const panelImages = customOrder.images.slice(0, requiredPanels);

    if (!panelImages.every(Boolean)) {
      toast.error('Please upload all required images for each panel before submitting.');
      return;
    }

    if (!customOrder.customerName.trim() || !customOrder.customerEmail.trim() || !customOrder.customerPhone.trim()) {
      toast.error('Please provide your name, email, and phone number.');
      return;
    }

    if (!customOrder.shippingStreet.trim() || !customOrder.shippingCity.trim() || !customOrder.shippingState.trim() || !customOrder.shippingZip.trim() || !customOrder.shippingCountry.trim()) {
      toast.error('Please complete the full shipping address.');
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(customOrder.customerEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmittingCustomOrder(true);

    const formData = new FormData();
    formData.append('productId', product._id);
    formData.append('size', customOrder.size);
    formData.append('panels', customOrder.panels);
    formData.append('lightType', customOrder.lightType);
    formData.append('notes', customOrder.notes);
    formData.append('customerName', customOrder.customerName);
    formData.append('customerEmail', customOrder.customerEmail);
    formData.append('customerPhone', customOrder.customerPhone);
    formData.append('shippingStreet', customOrder.shippingStreet);
    formData.append('shippingCity', customOrder.shippingCity);
    formData.append('shippingState', customOrder.shippingState);
    formData.append('shippingZip', customOrder.shippingZip);
    formData.append('shippingCountry', customOrder.shippingCountry);

    // Add promo code if validated and valid
    if (promoValidation && promoValidation.valid) {
      formData.append('promoCode', promoValidation.promoCode);
    }

    panelImages.forEach((file, idx) => {
      formData.append('images[]', file);
      formData.append(`imageOrder[${idx}]`, idx + 1);
    });

    try {
      const response = await fetch('/api/products/custom-orders', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit custom order');
      }

      setCustomOrderResult({
        orderId: data.orderId,
        totalPrice: data.totalPrice,
        depositAmount: data.depositAmount,
        remainingBalance: data.remainingBalance,
        checkoutUrl: data.checkoutUrl,
        status: data.status,
      });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      toast.success('Custom order created successfully. Deposit is due now.');
      setCustomOrder({
        images: [null],
        size: 'medium',
        panels: 'single',
        lightType: 'led',
        notes: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        shippingStreet: '',
        shippingCity: '',
        shippingState: '',
        shippingZip: '',
        shippingCountry: ''
      });
    } catch (error) {
      console.error('Error submitting custom order:', error);
      toast.error(error.message || 'Failed to submit custom order. Please try again.');
    } finally {
      setIsSubmittingCustomOrder(false);
    }
  };

  const normalizeProduct = (p) => ({
    ...p,
    name: p.name || p.title || 'Untitled',
    title: p.title || p.name || 'Untitled',
    imageGallery: Array.isArray(p.imageGallery) ? p.imageGallery.filter(Boolean) : [],
    image: p.image || p.hero_image_url || (Array.isArray(p.imageGallery) ? p.imageGallery[0] : '') || '',
    priceFormatted: p.priceFormatted || (Number.isFinite(p.price) ? `$${p.price.toFixed(2)}` : '$0.00'),
  });

  const getGalleryImages = (prod) => {
    const list = Array.isArray(prod.imageGallery) ? prod.imageGallery.filter(Boolean) : [];
    if (list.length) return list;
    if (prod.image) return [prod.image];
    return [];
  };

  if (loading) {
    return (
      <div className="product-detail-loading">
        <div className="product-detail-loading-spinner">
          <div className="product-detail-loading-inner"></div>
        </div>
        <div className="product-detail-loading-text">Loading Product...</div>
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="product-detail-container">
        <Link to="/store" className="product-detail-back-link">← Back to Store</Link>
        <div className="product-detail-error">
          <h2>Product Not Found</h2>
          <p>The product you're looking for doesn't exist or is not available.</p>
        </div>
      </div>
    );
  }

  if (error === 'general' || !product) {
    return (
      <div className="product-detail-container">
        <Link to="/store" className="product-detail-back-link">← Back to Store</Link>
        <div className="product-detail-error">
          <h2>Error Loading Product</h2>
          <p>Something went wrong. Please try again later.</p>
        </div>
      </div>
    );
  }

  const normalized = normalizeProduct(product);
  const availability = getAvailabilityStatus(product.stock, product.status);
  const requiredPanelCount = getRequiredPanelCount(customOrder.panels);
  const isLamp = product.category === 'lamps';
  const galleryImages = getGalleryImages(normalized);
  const heroImage = galleryImages[activeImageIndex] || normalized.image;
  const panelPriceTotal = Number(product.price || 0) * requiredPanelCount;
  const realBuildImages = isLamp && galleryImages.length >= 3
    ? galleryImages.slice(0, 6)
    : [];
  
  // Use handcrafted content overrides if available, otherwise use dynamic generation
  const productContent = getProductContent(slug, product, {
    highlights: getProductHighlights,
    useCases: getUseCasesGenerated,
    whatsIncluded: getWhatsIncludedGenerated,
    description: generateProductDescription,
  });

  return (
    <div className={`product-detail-container${isLamp ? ' is-lamp' : ''}`}>
      <Link to="/store" className="product-detail-back-link">← Back to Store</Link>

      <div className="product-detail-content">
        {/* Left Column: Image */}
        <div className="product-detail-image-column">
          <div className="product-detail-gallery">
            <button
              type="button"
              className="product-detail-hero"
              onClick={() => {
                if (!heroImage) return;
                setLightboxImage(heroImage);
                setIsLightboxOpen(true);
              }}
            >
              <img
                src={getImageSrc(heroImage)}
                alt={normalized.title}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_PLACEHOLDER;
                }}
                className="product-detail-image"
              />
            </button>
            {galleryImages.length > 1 && (
              <div className="product-detail-thumbnails">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={`product-detail-thumbnail${index === activeImageIndex ? ' is-active' : ''}`}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img
                      src={getImageSrc(image)}
                      alt={`${normalized.title} thumbnail ${index + 1}`}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PLACEHOLDER;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="product-detail-info-column">
          <h1 className="product-detail-title">{normalized.title}</h1>
          {isLamp && (
            <div className="product-detail-lamp-tagline">
              Made from your photos. Designed to glow with meaning.
            </div>
          )}
          <div className="product-detail-price">{normalized.priceFormatted}</div>
          <div className={`product-detail-availability ${availability.className}`}>
            {availability.text}
          </div>

          {/* Highlights */}
          <ul className="product-detail-highlights">
            {productContent.highlights.map((highlight, idx) => (
              <li key={idx}>{highlight}</li>
            ))}
          </ul>

          {/* Add to Cart Actions or Custom Order Form */}
          {product.category === 'lamps' ? (
            <div className="product-detail-custom-order">
              <div className="product-detail-custom-order-title">Customize Your Lamp</div>
              <p className="product-detail-custom-order-copy">
                Upload your favorite photos and we will craft a glowing keepsake made to gift or display.
              </p>

              {customOrderResult && (
                <div className="product-detail-custom-success">
                  <h3>Order started</h3>
                  <p>
                    Your custom lamp order <strong>{customOrderResult.orderId}</strong> has been created.
                  </p>
                  <div className="product-detail-summary-row">
                    <span>Total Price:</span>
                    <strong>{`$${customOrderResult.totalPrice?.toFixed(2) || '0.00'}`}</strong>
                  </div>
                  <div className="product-detail-summary-row">
                    <span>Deposit Due:</span>
                    <strong>{`$${customOrderResult.depositAmount?.toFixed(2) || '0.00'}`}</strong>
                  </div>
                  <div className="product-detail-summary-row">
                    <span>Remaining Balance:</span>
                    <strong>{`$${customOrderResult.remainingBalance?.toFixed(2) || '0.00'}`}</strong>
                  </div>
                </div>
              )}

              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Upload Photos</label>
                <p className="product-detail-custom-helper">Upload one image per panel in the order you want them displayed.</p>
                {Array.from({ length: requiredPanelCount }, (_, index) => (
                  <div key={index} className="product-detail-panel-upload-block">
                    <div className="product-detail-panel-upload-label">Panel {index + 1}</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        handlePanelImageUpload(index, file);
                      }}
                      className="product-detail-custom-file"
                    />
                    {customOrder.images[index] && (
                      <div className="product-detail-custom-preview">
                        <img
                          src={URL.createObjectURL(customOrder.images[index])}
                          alt={`Panel ${index + 1} Preview`}
                          className="product-detail-custom-preview-img"
                        />
                        <div className="product-detail-custom-filename">
                          {customOrder.images[index].name}
                        </div>
                        <button
                          type="button"
                          className="product-detail-custom-remove"
                          onClick={() => handleRemovePanelImage(index)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Your Contact Information</label>
                <div className="product-detail-custom-grid">
                  <input
                    type="text"
                    value={customOrder.customerName}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Full name"
                    className="product-detail-custom-input"
                  />
                  <input
                    type="email"
                    value={customOrder.customerEmail}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="Email address"
                    className="product-detail-custom-input"
                  />
                  <input
                    type="text"
                    value={customOrder.customerPhone}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="Phone number"
                    className="product-detail-custom-input"
                  />
                </div>
              </div>

              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Shipping Address</label>
                <div className="product-detail-custom-grid">
                  <input
                    type="text"
                    value={customOrder.shippingStreet}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, shippingStreet: e.target.value }))}
                    placeholder="Street address"
                    className="product-detail-custom-input"
                  />
                  <input
                    type="text"
                    value={customOrder.shippingCity}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, shippingCity: e.target.value }))}
                    placeholder="City"
                    className="product-detail-custom-input"
                  />
                  <input
                    type="text"
                    value={customOrder.shippingState}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, shippingState: e.target.value }))}
                    placeholder="State"
                    className="product-detail-custom-input"
                  />
                  <input
                    type="text"
                    value={customOrder.shippingZip}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, shippingZip: e.target.value }))}
                    placeholder="ZIP code"
                    className="product-detail-custom-input"
                  />
                  <input
                    type="text"
                    value={customOrder.shippingCountry}
                    onChange={(e) => setCustomOrder(prev => ({ ...prev, shippingCountry: e.target.value }))}
                    placeholder="Country"
                    className="product-detail-custom-input"
                  />
                </div>
              </div>

              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Size</label>
                <select
                  value={customOrder.size}
                  onChange={(e) => setCustomOrder(prev => ({ ...prev, size: e.target.value }))}
                  className="product-detail-custom-select"
                >
                  <option value="small">Small (4" height)</option>
                  <option value="medium">Medium (6" height)</option>
                  <option value="large">Large (8" height)</option>
                </select>
              </div>

              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Panels</label>
                <select
                  value={customOrder.panels}
                  onChange={(e) => {
                    const panelValue = e.target.value;
                    const nextCount = getRequiredPanelCount(panelValue);
                    setCustomOrder(prev => {
                      const nextImages = [...(prev.images || [])].slice(0, nextCount);
                      while (nextImages.length < nextCount) {
                        nextImages.push(null);
                      }
                      return { ...prev, panels: panelValue, images: nextImages };
                    });
                  }}
                  className="product-detail-custom-select"
                >
                  <option value="single">Single Panel</option>
                  <option value="double">Double Panel</option>
                  <option value="triple">Triple Panel</option>
                  <option value="quad">Quad Panel</option>
                </select>
              </div>

              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Light Type</label>
                <select
                  value={customOrder.lightType}
                  onChange={(e) => setCustomOrder(prev => ({ ...prev, lightType: e.target.value }))}
                  className="product-detail-custom-select"
                >
                  <option value="led">LED Strip</option>
                  <option value="bulb">Incandescent Bulb</option>
                  <option value="rgb">RGB LED</option>
                </select>
              </div>

              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Special Notes</label>
                <textarea
                  value={customOrder.notes}
                  onChange={(e) => setCustomOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions or preferences..."
                  className="product-detail-custom-textarea"
                  rows={3}
                />
              </div>

              {/* Promo Code Section */}
              <div className="product-detail-custom-field">
                <label className="product-detail-custom-label">Promo Code</label>
                <div className="product-detail-promo-container">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={handlePromoCodeChange}
                    placeholder="Enter promo code"
                    className="product-detail-custom-input product-detail-promo-input"
                    disabled={isValidatingPromo}
                  />
                  <button
                    type="button"
                    onClick={handlePromoValidation}
                    className="product-detail-promo-apply"
                    disabled={isValidatingPromo || !promoCode.trim()}
                  >
                    {isValidatingPromo ? 'Applying...' : 'Apply Code'}
                  </button>
                </div>
                {promoValidation && (
                  <div className={`product-detail-promo-message ${promoValidation.valid ? 'success' : 'error'}`}>
                    {promoValidation.valid ? (
                      <>
                        <span className="promo-check">✓</span>
                        Promo applied: {promoValidation.description}
                      </>
                    ) : (
                      <>
                        <span className="promo-error">✗</span>
                        {promoValidation.error}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="product-detail-custom-summary">
                {promoValidation && promoValidation.valid ? (
                  <>
                    <div className="product-detail-summary-row">
                      <span>Original Price:</span>
                      <strong style={{ textDecoration: 'line-through', color: '#666' }}>
                        ${promoValidation.originalPrice.toFixed(2)}
                      </strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Discount ({promoValidation.discountType === 'percentage' ? `${promoValidation.discountValue}%` : `$${promoValidation.discountValue}`}):</span>
                      <strong style={{ color: '#00ff41' }}>
                        -${promoValidation.discountAmount.toFixed(2)}
                      </strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Discounted Total:</span>
                      <strong>${promoValidation.discountedTotal.toFixed(2)}</strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Deposit Due Now (50%):</span>
                      <strong>${promoValidation.depositAmount.toFixed(2)}</strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Remaining Balance:</span>
                      <strong>${promoValidation.remainingBalance.toFixed(2)}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="product-detail-summary-row">
                      <span>Total Price:</span>
                      <strong>{panelPriceTotal ? `$${panelPriceTotal.toFixed(2)}` : '$0.00'}</strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Deposit Due Now (50%):</span>
                      <strong>{panelPriceTotal ? `$${(panelPriceTotal * 0.5).toFixed(2)}` : '$0.00'}</strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Remaining Balance:</span>
                      <strong>{panelPriceTotal ? `$${(panelPriceTotal * 0.5).toFixed(2)}` : '$0.00'}</strong>
                    </div>
                  </>
                )}
                <div className="product-detail-summary-note">
                  A 50% deposit is required to begin your custom lamp order.
                </div>
              </div>

              <button
                onClick={handleCustomOrderSubmit}
                className="product-detail-custom-submit"
                disabled={isSubmittingCustomOrder || !customOrder.images.slice(0, requiredPanelCount).every(Boolean)}
              >
                {isSubmittingCustomOrder ? 'Processing...' : 'Pay Deposit & Start Custom Order'}
              </button>
            </div>
          ) : (
            <div className="product-detail-actions">
              <button
                onClick={() => {
                  addToCart(product);
                  toast.success(`${normalized.title} added to cart!`);
                }}
                className="product-detail-add-to-cart"
                disabled={product.stock <= 0 && product.status !== 'active'}
              >
                Add to Cart
              </button>
              <div className="product-detail-stock-info">
                {product.stock} in stock
              </div>
            </div>
          )}

          {/* Trust Indicators */}
          <div className="product-detail-trust-indicators">
            {getTrustIndicators().map((indicator, idx) => (
              <div key={idx} className="product-detail-trust-item">
                <div className="product-detail-trust-icon">{indicator.icon}</div>
                <div>{indicator.text}</div>
              </div>
            ))}
          </div>

          {/* Meta Information */}
          <div className="product-detail-meta">
            {product.brand && (
              <div className="product-detail-meta-item">
                <div className="product-detail-meta-label">Brand</div>
                <div className="product-detail-meta-value">{product.brand}</div>
              </div>
            )}
            {product.sku && (
              <div className="product-detail-meta-item">
                <div className="product-detail-meta-label">SKU</div>
                <div className="product-detail-meta-value">{product.sku}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Sections */}
      <div className="product-detail-sections">
        <div className="product-detail-section">
          <div className="product-detail-section-title">Description</div>
          <div className="product-detail-section-content">
            {productContent.description}
          </div>
          {productContent.batchNote && (
            <div className="product-detail-batch-note">
              {productContent.batchNote}
            </div>
          )}
        </div>

        <div className="product-detail-section">
          <div className="product-detail-section-title">Specifications</div>
          <ul>
            <li>Premium-grade materials</li>
            <li>Professional quality assurance</li>
            {product.category && <li>Category: {getCategoryLabel(product.category)}</li>}
            {product.version && <li>Version: {product.version}</li>}
            <li>Full technical support</li>
          </ul>
        </div>

        <div className="product-detail-section">
          <div className="product-detail-section-title">What's Included</div>
          <ul>
            {productContent.whatsIncluded.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="product-detail-use-cases">
        <div className="product-detail-use-cases-title">Use Cases & Applications</div>
        <ul>
          {productContent.useCases.map((useCase, idx) => (
            <li key={idx}>{useCase}</li>
          ))}
        </ul>
      </div>

      {isLamp && realBuildImages.length > 0 && (
        <div className="product-detail-real-builds">
          <div className="product-detail-real-builds-title">Real Builds</div>
          <div className="product-detail-real-builds-grid">
            {realBuildImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className="product-detail-real-builds-card"
                onClick={() => {
                  setLightboxImage(image);
                  setIsLightboxOpen(true);
                }}
              >
                <img
                  src={getImageSrc(image)}
                  alt={`Real build ${index + 1}`}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_PLACEHOLDER;
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Important Notice Section */}
      <div className="product-detail-notice">
        <div className="product-detail-notice-title">
          ⚠️ Important Notice
        </div>
        <div className="product-detail-section-content">
          {product.category === 'security' || product.category === 'hardware'
            ? 'This product is intended for authorized security research, testing, and professional use only. Users are responsible for ensuring legal compliance with all applicable laws and regulations in their jurisdiction. Misuse or unauthorized access to systems is illegal.'
            : 'Please ensure this product is used in accordance with applicable laws and regulations. We provide this product as-is and recommend thorough testing before production use.'}
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="product-detail-related-section">
          <h2 className="product-detail-related-title">Related Products</h2>
          <div className="product-detail-related-grid">
            {relatedProducts.map(relProduct => {
              const relNormalized = normalizeProduct(relProduct);
              return (
                <Link key={relProduct._id} to={`/store/${relProduct.slug || relProduct._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="product-detail-related-card">
                    <img
                      src={getImageSrc(relNormalized.image)}
                      alt={relNormalized.title}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PLACEHOLDER;
                      }}
                      className="product-detail-related-image"
                    />
                    <div className="product-detail-related-name">{relNormalized.title}</div>
                    <div className="product-detail-related-price">{relNormalized.priceFormatted}</div>
                    <div className="product-detail-related-link">
                      View
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {isLightboxOpen && lightboxImage && (
        <div
          className="product-detail-lightbox"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="product-detail-lightbox-body"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="product-detail-lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
            >
              ×
            </button>
            <img
              src={getImageSrc(lightboxImage)}
              alt="Expanded view"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;