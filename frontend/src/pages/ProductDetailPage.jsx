import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from 'context/CartContext';
import { toast } from 'react-toastify';
import { getProductContent } from '../data/productOverrides';
import { resolveImageUrl, DEFAULT_PLACEHOLDER } from '../utils/resolveImageUrl';
import { calculatePrice } from '../utils/pricing';
import './ProductDetailPage.css';

function PanelConfigurator({
  lampshade,
  onSizeChange,
  onLightTypeChange,
  onPanelCountChange,
  onToggleAddon,
  onNotesChange,
  showSize = true,
  showLightType = true,
  showDiffuser = true,
  showNightlight = true,
}) {
  return (
    <>
      {showSize && (
        <div className="product-detail-custom-field">
          <label className="product-detail-custom-label">Size</label>
          <select
            value={lampshade.size}
            onChange={(e) => onSizeChange(e.target.value)}
            className="product-detail-custom-select"
          >
            <option value="small">Small - 100mm top / 150mm bottom / 150mm tall</option>
            <option value="medium">Medium - 150mm top / 200mm bottom / 200mm tall</option>
            <option value="large">Large - 200mm top / 250mm bottom / 250mm tall</option>
          </select>
        </div>
      )}

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Panel Count</label>
        <select
          value={lampshade.panelCount}
          onChange={(e) => onPanelCountChange(e.target.value)}
          className="product-detail-custom-select"
        >
          <option value={2}>2 Panels</option>
          <option value={3}>3 Panels</option>
          <option value={4}>4 Panels</option>
          <option value={5}>5 Panels</option>
        </select>
      </div>

      {showLightType && (
        <div className="product-detail-custom-field">
          <label className="product-detail-custom-label">Lighting Option (Shade)</label>
          <select
            value={lampshade.lightType}
            onChange={(e) => onLightTypeChange(e.target.value)}
            className="product-detail-custom-select"
          >
            <option value="led">LED Strip</option>
            <option value="bulb">Incandescent Bulb</option>
          </select>
        </div>
      )}

      {(showDiffuser || showNightlight) && (
        <div className="product-detail-custom-field">
          <label className="product-detail-custom-label">Add-ons</label>
          <div className="product-detail-custom-extras">
            {showNightlight && (
              <label className="product-detail-custom-checkbox">
                <input
                  type="checkbox"
                  checked={lampshade.addons.nightlight}
                  onChange={() => onToggleAddon('nightlight')}
                />
                Nightlight (+$5)
              </label>
            )}
            {showDiffuser && (
              <label className="product-detail-custom-checkbox">
                <input
                  type="checkbox"
                  checked={lampshade.addons.diffuser}
                  onChange={() => onToggleAddon('diffuser')}
                />
                Diffuser (+$10)
              </label>
            )}
          </div>
          {showDiffuser && (
            <div className="product-detail-custom-helper">
              Diffuser softens the light and improves image clarity.
            </div>
          )}
        </div>
      )}

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Lampshade Notes</label>
        <textarea
          value={lampshade.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any special instructions or preferences..."
          className="product-detail-custom-textarea"
          rows={3}
        />
      </div>
    </>
  );
}

function GlobeLampConfigurator({ lampshade, onSizeChange, onToggleAddon, onNotesChange }) {
  return (
    <>
      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Size</label>
        <select
          value={lampshade.size}
          onChange={(e) => onSizeChange(e.target.value)}
          className="product-detail-custom-select"
        >
          <option value="small">Small - 100mm top / 150mm bottom / 150mm tall</option>
          <option value="medium">Medium - 150mm top / 200mm bottom / 200mm tall</option>
          <option value="large">Large - 200mm top / 250mm bottom / 250mm tall</option>
        </select>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Appearance Options</label>
        <div className="product-detail-custom-extras">
          <label className="product-detail-custom-checkbox">
            <input
              type="checkbox"
              checked={lampshade.addons.moonBackground}
              onChange={() => onToggleAddon('moonBackground')}
            />
            Use Moon Background for Empty Space
          </label>
        </div>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Lamp Notes</label>
        <textarea
          value={lampshade.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any special instructions or preferences..."
          className="product-detail-custom-textarea"
          rows={3}
        />
      </div>
    </>
  );
}

function CylinderConfigurator({
  cylinder,
  onSizeChange,
  onPanelCountChange,
  onImageStyleChange,
  onLightTypeChange,
  onToggleAddon,
  onNotesChange,
}) {
  return (
    <>
      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Size</label>
        <select
          value={cylinder.size}
          onChange={(e) => onSizeChange(e.target.value)}
          className="product-detail-custom-select"
        >
          <option value="small">Small - 100mm top / 150mm bottom / 150mm tall</option>
          <option value="medium">Medium - 150mm top / 200mm bottom / 200mm tall</option>
          <option value="large">Large - 200mm top / 250mm bottom / 250mm tall</option>
        </select>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Choose how many photos you want to include</label>
        <select
          value={cylinder.panelCount}
          onChange={(e) => onPanelCountChange(e.target.value)}
          className="product-detail-custom-select"
        >
          <option value={2}>2 Photos</option>
          <option value={3}>3 Photos</option>
          <option value={4}>4 Photos</option>
          <option value={5}>5 Photos</option>
        </select>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Image Style</label>
        <select
          value={cylinder.imageStyle}
          onChange={(e) => onImageStyleChange(e.target.value)}
          className="product-detail-custom-select"
        >
          <option value="wrap">Full Wrap</option>
          <option value="panel">Paneled Wrap</option>
          <option value="spot">Spotlight</option>
        </select>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Lighting Option (Shade)</label>
        <select
          value={cylinder.lightType}
          onChange={(e) => onLightTypeChange(e.target.value)}
          className="product-detail-custom-select"
        >
          <option value="led">LED Strip</option>
          <option value="bulb">Incandescent Bulb</option>
          <option value="rgb">RGB Lighting</option>
        </select>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Cylinder Notes</label>
        <textarea
          value={cylinder.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any special instructions or preferences..."
          className="product-detail-custom-textarea"
          rows={3}
        />
      </div>
    </>
  );
}

function BoxConfigurator({
  box,
  onNotesChange,
}) {
  return (
    <>
      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Box Notes</label>
        <textarea
          value={box.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any special instructions or preferences..."
          className="product-detail-custom-textarea"
          rows={3}
        />
      </div>
    </>
  );
}

function FamilyBundleConfigurator({
  images,
  onImageUpload,
  onRemoveImage,
  notes,
  onNotesChange,
}) {
  const imageSlots = [...images].slice(0, 4);
  while (imageSlots.length < 4) imageSlots.push(null);

  return (
    <>
      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Upload Your 4 Photos</label>
        <ul className="product-detail-bundle-upload-guidance">
          <li>Use clear, high-quality images</li>
          <li>Portraits and close-ups work best</li>
          <li>One image is required for each upload slot</li>
          <li>Exactly 4 photos are needed for this bundle</li>
        </ul>
        <div className="product-detail-custom-helper" style={{ fontStyle: 'italic', marginBottom: '12px' }}>
          Each image is used across the full bundle of lamps, night lights, and diffusers.
        </div>
        {imageSlots.map((image, index) => (
          <div key={index} className="product-detail-custom-field" style={{ marginBottom: '12px' }}>
            <label className="product-detail-custom-label">Image {index + 1}</label>
            <input
              type="file"
              name="images[]"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageUpload(index, file);
              }}
              className="product-detail-custom-input"
            />
            {image && (
              <div style={{ marginTop: '8px', color: '#ccc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Bundle preview ${index + 1}`}
                      style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <span>{image.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    style={{
                      background: 'transparent',
                      color: '#ff6b6b',
                      border: '1px solid rgba(255, 107, 107, 0.4)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Bundle Notes</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any special instructions or preferences..."
          className="product-detail-custom-textarea"
          rows={3}
        />
      </div>
    </>
  );
}

function SwappableBoxConfigurator({
  swappableBox,
  onExtraPanelSetChange,
  onLightingIncludedChange,
  onToggleAddon,
  onNotesChange,
}) {
  return (
    <>
      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Panel Count</label>
        <div className="product-detail-custom-static">5 panels (swappable)</div>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Extra Panel Set</label>
        <label className="product-detail-custom-checkbox">
          <input
            type="checkbox"
            checked={swappableBox.extraPanelSet}
            onChange={(e) => onExtraPanelSetChange(e.target.checked)}
          />
          Add an extra interchangeable panel set
        </label>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Lighting Included</label>
        <label className="product-detail-custom-checkbox">
          <input
            type="checkbox"
            checked={swappableBox.lightingIncluded}
            onChange={(e) => onLightingIncludedChange(e.target.checked)}
          />
          Include lighting kit
        </label>
      </div>

      <div className="product-detail-custom-field">
        <label className="product-detail-custom-label">Swappable Box Notes</label>
        <textarea
          value={swappableBox.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any special instructions or preferences..."
          className="product-detail-custom-textarea"
          rows={3}
        />
      </div>
    </>
  );
}

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
    productType: 'panel',
    images: [null],
    lampshade: {
      size: 'medium',
      panelCount: 2,
      lightType: 'led',
      addons: {
        nightlight: false,
        diffuser: false,
        moonBackground: false,
      },
      notes: '',
    },
    cylinder: {
      size: 'small',
      panelCount: 2,
      imageStyle: 'wrap',
      lightType: 'led',
      addons: {
        nightlight: false,
      },
      notes: '',
    },
    fixedBox4: {
      notes: '',
    },
    swappableBox5: {
      panelCount: 5,
      panelImages: [],
      extraPanelSet: false,
      lightingIncluded: false,
      addons: {
        nightlight: false,
      },
      notes: '',
    },
    nightlightAddon: {
      imageSource: 'main_existing',
      selectedMainImageIndex: 0,
      separateImage: null,
    },
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
  const [uploadError, setUploadError] = useState('');
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');
  const customOrderIdempotencyKey = useRef(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const clampPanelCount = (value) => {
    const count = Number(value) || 2;
    return Math.min(5, Math.max(2, count));
  };

  const requiresBoxConfigurator = (type) => type === 'fixedBox4' || type === 'panelBox5';

  const resolveProductType = (productData, routeSlug) => {
    const sku = String(productData?.sku || '').toUpperCase();
    if (sku === 'LITHCYL01') return 'cylinder';
    if (sku === 'LITHMUL02') return 'panel';
    if (sku === 'LITHBOX03') return 'fixedBox4';
    if (sku === 'LITHBOX05') return 'panelBox5';
    if (sku === 'LITHGLB04') return 'globeLamp';
    if (sku === 'LITHBUNDLE01') return 'familyBundle4';
    if (sku === 'LITHNL01') return 'nightlight';
    if (routeSlug === 'lithophane-night-light') return 'nightlight';
    if (routeSlug === 'lithophane-box') return 'fixedBox4';
    if (routeSlug === 'five-sided-lithophane-panel-box') return 'panelBox5';
    if (routeSlug === 'custom-lithophane-lamp-cylinder') return 'cylinder';
    if (routeSlug === 'multi-panel-lithophane-lamp') return 'panel';
    if (routeSlug === 'custom-family-lithophane-bundle') return 'familyBundle4';
    if (routeSlug === 'lithophane-globe-lamp') return 'globeLamp';
    return 'panel';
  };

  const getBasePriceForLamp = (productData, routeSlug) => {
    const type = resolveProductType(productData, routeSlug);
    if (type === 'fixedBox4') {
      return calculatePrice({ productType: 'fixedBox4' });
    }
    if (type === 'panelBox5' || type === 'swappableBox5') {
      return calculatePrice({ productType: 'panelBox5' });
    }
    if (type === 'globeLamp') {
      return calculatePrice({ productType: 'globeLamp', size: 'medium' });
    }
    if (type === 'familyBundle4') {
      return calculatePrice({ productType: 'familyBundle4' });
    }
    if (type === 'cylinder') {
      return calculatePrice({ productType: 'cylinder', panelCount: 2, size: 'small' });
    }
    return calculatePrice({ productType: 'panel', panelCount: 2, size: 'medium' });
  };

  const updateLampshade = (updates) => {
    setCustomOrder((prev) => ({
      ...prev,
      lampshade: {
        ...prev.lampshade,
        ...updates,
      },
    }));
  };

  const updateCylinder = (updates) => {
    setCustomOrder((prev) => ({
      ...prev,
      cylinder: {
        ...prev.cylinder,
        ...updates,
      },
    }));
  };

  const updateFixedBox4 = (updates) => {
    setCustomOrder((prev) => ({
      ...prev,
      fixedBox4: {
        ...prev.fixedBox4,
        ...updates,
      },
    }));
  };

  const updateSwappableBox5 = (updates) => {
    setCustomOrder((prev) => ({
      ...prev,
      swappableBox5: {
        ...prev.swappableBox5,
        ...updates,
      },
    }));
  };

  const updateNightlightAddon = (updates) => {
    setCustomOrder((prev) => ({
      ...prev,
      nightlightAddon: {
        ...prev.nightlightAddon,
        ...updates,
      },
    }));
  };

  const toggleAddon = (target, addonKey) => {
    setCustomOrder((prev) => {
      const current = prev[target] || {};
      const addons = current.addons || { nightlight: false };
      const nextValue = !addons[addonKey];
      return {
        ...prev,
        [target]: {
          ...current,
          addons: {
            ...addons,
            [addonKey]: nextValue,
          },
        },
        ...(addonKey === 'nightlight' && !nextValue ? {
          nightlightAddon: {
            imageSource: 'main_existing',
            selectedMainImageIndex: 0,
            separateImage: null,
          },
        } : {}),
      };
    });
  };

  const getActiveAddons = () => {
    const isCylinderOrder = customOrder.productType === 'cylinder';
    const isPanelOrder = customOrder.productType === 'panel';
    const isGlobeLampOrder = customOrder.productType === 'globeLamp';
    const isPanelBox5Order = customOrder.productType === 'panelBox5';
    const isFixedBox4Order = customOrder.productType === 'fixedBox4';
    const isSwappableBox5Order = customOrder.productType === 'swappableBox5';
    if (isCylinderOrder) return customOrder.cylinder.addons;
    if (isPanelOrder) return customOrder.lampshade.addons;
    if (isGlobeLampOrder) return customOrder.lampshade.addons;
    if (isSwappableBox5Order) return customOrder.swappableBox5.addons;
    if (isFixedBox4Order || isPanelBox5Order) return {};
    return customOrder.lampshade.addons;
  };

  const handlePromoValidation = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    setPromoValidation(null);

    const isCylinderOrder = customOrder.productType === 'cylinder';
    const isPanelOrder = customOrder.productType === 'panel';
    const isGlobeLampOrder = customOrder.productType === 'globeLamp';
    const isPanelBox5Order = customOrder.productType === 'panelBox5';
    const isFixedBox4Order = customOrder.productType === 'fixedBox4';
    const isSwappableBox5Order = customOrder.productType === 'swappableBox5';
    const activePanelCount = isCylinderOrder
      ? clampPanelCount(customOrder.cylinder.panelCount)
      : isPanelOrder
        ? clampPanelCount(customOrder.lampshade.panelCount)
        : isGlobeLampOrder
          ? 1
          : isFixedBox4Order
            ? 4
            : isPanelBox5Order || isSwappableBox5Order
              ? 5
              : 2;
const activeAddons = getActiveAddons();

    try {
      const response = await fetch('/api/products/custom-orders/validate-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product._id,
          promoCode: promoCode.trim(),
          productType: customOrder.productType || 'panel',
          panelCount: activePanelCount,
          size: customOrder.productType === 'cylinder'
            ? customOrder.cylinder.size
            : customOrder.productType === 'globeLamp'
              ? customOrder.lampshade.size
              : customOrder.lampshade.size,
          addons: activeAddons,
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

  const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
  const RECOMMENDED_UPLOAD_TEXT = 'Recommended: 3000×3000 px or larger, JPG/PNG.';

  const validateUploadFile = (file) => {
    if (!file) return ['No file selected.'];
    const errors = [];
    if (!file.type.startsWith('image/')) {
      errors.push('Upload must be an image file.');
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      errors.push('Image must be 10 MB or smaller.');
    }
    return errors;
  };

  const recordUploadError = (errors) => {
    setUploadError(errors.length > 0 ? errors.join(' ') : '');
  };

  const handlePanelImageUpload = (index, file) => {
    if (!file) return;
    const errors = validateUploadFile(file);
    if (errors.length) {
      recordUploadError(errors);
      return;
    }
    recordUploadError([]);
    setCustomOrder(prev => {
      const nextImages = [...prev.images];
      nextImages[index] = file;
      const nextSwappableImages = prev.productType === 'swappableBox5'
        ? nextImages.map((img) => (img ? img.name : '')).filter(Boolean)
        : prev.swappableBox5.panelImages;
      return {
        ...prev,
        images: nextImages,
        swappableBox5: {
          ...prev.swappableBox5,
          panelImages: nextSwappableImages,
        },
      };
    });
  };

  const handleNightlightImageUpload = (file) => {
    if (!file) return;
    const errors = validateUploadFile(file);
    if (errors.length) {
      recordUploadError(errors);
      return;
    }
    recordUploadError([]);
    setCustomOrder(prev => ({
      ...prev,
      nightlightAddon: {
        ...prev.nightlightAddon,
        separateImage: file,
      },
    }));
  };

  const handleRemovePanelImage = (index) => {
    setCustomOrder(prev => {
      const nextImages = [...prev.images];
      nextImages[index] = null;
      const nextSwappableImages = prev.productType === 'swappableBox5'
        ? nextImages.map((img) => (img ? img.name : '')).filter(Boolean)
        : prev.swappableBox5.panelImages;
      return {
        ...prev,
        images: nextImages,
        swappableBox5: {
          ...prev.swappableBox5,
          panelImages: nextSwappableImages,
        },
      };
    });
  };

  const handleBundleImageUpload = (index, file) => {
    if (!file) return;
    const errors = validateUploadFile(file);
    if (errors.length) {
      recordUploadError(errors);
      return;
    }
    recordUploadError([]);
    setCustomOrder(prev => {
      const nextImages = [...prev.images];
      while (nextImages.length < 4) nextImages.push(null);
      nextImages[index] = file;
      return {
        ...prev,
        images: nextImages,
      };
    });
  };

  const handleRemoveBundleImage = (index) => {
    setCustomOrder(prev => {
      const nextImages = [...prev.images];
      nextImages[index] = null;
      return {
        ...prev,
        images: nextImages,
      };
    });
  };

  const getOrCreateCustomOrderIdempotencyKey = () => {
    if (!customOrderIdempotencyKey.current) {
      customOrderIdempotencyKey.current = window.crypto?.randomUUID?.() || `custom-order-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    return customOrderIdempotencyKey.current;
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
        const resolvedType = resolveProductType(data, slug);
        setCustomOrder((prev) => ({
          ...prev,
          productType: resolvedType,
        }));

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
  }, [product]);

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
      'lamps': 'Custom Lampshades',
      'custom': 'Custom Products',
    };
    return categoryMap[category] || (category ? category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ') : 'Tools & Accessories');
  };

  const getProductHighlights = (prod) => {
    if (prod.category === 'lamps') {
      const highlights = [
        'Handcrafted from your photos',
        'Shade-only design for compatible bases',
        'Soft, warm ambient glow with your base',
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
      'lamps': `Turn your favorite photos into a warm, glowing lithophane lamp that pairs with a compatible base. ${title} is handcrafted to preserve fine detail, designed to feel premium, and made to gift, display, and treasure for years. Choose your size, panel count, and lighting for a truly personal lamp.`,
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

  const activeAddons = getActiveAddons() || {};
  const nightlightAddon = customOrder.nightlightAddon || {};
  const mainUploadedImages = customOrder.images.filter(Boolean);

  const handleCustomOrderSubmit = async () => {
    const isCylinderOrder = customOrder.productType === 'cylinder';
    const isPanelOrder = customOrder.productType === 'panel';
    const isGlobeLampOrder = customOrder.productType === 'globeLamp';
    const isPanelBox5Order = customOrder.productType === 'panelBox5';
    const isFixedBox4Order = customOrder.productType === 'fixedBox4';
    const isFamilyBundleOrder = customOrder.productType === 'familyBundle4';
    const isSwappableBox5Order = customOrder.productType === 'swappableBox5';
    const isNightlightOrder = customOrder.productType === 'nightlight';
    const activePanelCount = isCylinderOrder
      ? clampPanelCount(customOrder.cylinder.panelCount)
      : isPanelOrder
        ? clampPanelCount(customOrder.lampshade.panelCount)
        : isGlobeLampOrder
          ? 1
          : isNightlightOrder
            ? 1
            : isFixedBox4Order
              ? 4
              : isPanelBox5Order || isSwappableBox5Order
                ? 5
                : 2;
    const requiredPanels = activePanelCount;
    const panelImages = customOrder.productType === 'globeLamp'
      ? customOrder.images.filter(Boolean).slice(0, 5)
      : customOrder.images.slice(0, requiredPanels);

    const activeAddons = getActiveAddons();

    if (customOrder.productType === 'globeLamp') {
      if (panelImages.length < 1) {
        toast.error('Please upload at least one image before submitting.');
        return;
      }
    } else if (customOrder.productType === 'familyBundle4') {
      if (panelImages.length !== 4 || !panelImages.every(Boolean)) {
        toast.error('Please upload all 4 bundle images before submitting.');
        return;
      }
    } else if (!panelImages.every(Boolean)) {
      toast.error('Please upload all required images before submitting.');
      return;
    }

    const isNightlightSelected = activeAddons.nightlight;
    if (isNightlightSelected) {
      const { imageSource, selectedMainImageIndex, separateImage } = customOrder.nightlightAddon || {};
      if (imageSource === 'main_existing') {
        if (selectedMainImageIndex == null || !customOrder.images[selectedMainImageIndex]) {
          toast.error('Please select a main image for the nightlight addon.');
          return;
        }
      } else if (imageSource === 'separate_upload') {
        if (!separateImage) {
          toast.error('Please upload a separate image for the nightlight addon.');
          return;
        }
      }
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
    const appendArray = (key, values) => {
      if (!Array.isArray(values)) return;
      values.filter(Boolean).forEach((value) => {
        formData.append(`${key}[]`, value);
      });
    };
    formData.append('productId', product._id);
    formData.append('productType', customOrder.productType || 'panel');
    if (isCylinderOrder) {
      formData.append('size', customOrder.cylinder.size);
      formData.append('panelCount', activePanelCount);
      formData.append('lightType', customOrder.cylinder.lightType);
      formData.append('addons', JSON.stringify(customOrder.cylinder.addons || {}));
      formData.append('notes', customOrder.cylinder.notes);
      formData.append('imageStyle', customOrder.cylinder.imageStyle);
    } else if (isFixedBox4Order || isPanelBox5Order) {
      const panelCount = isPanelBox5Order ? 5 : 4;
      formData.append('panelCount', panelCount);
      formData.append('lightType', 'none');
      formData.append('notes', customOrder.fixedBox4.notes);
    } else if (isSwappableBox5Order) {
      formData.append('panelCount', 5);
      formData.append('lightType', customOrder.swappableBox5.lightingIncluded ? 'led' : 'none');
      formData.append('addons', JSON.stringify(customOrder.swappableBox5.addons || {}));
      formData.append('notes', customOrder.swappableBox5.notes);
      appendArray('panelImages', customOrder.swappableBox5.panelImages || []);
      formData.append('extraPanelSet', !!customOrder.swappableBox5.extraPanelSet);
      formData.append('lightingIncluded', !!customOrder.swappableBox5.lightingIncluded);
    } else if (customOrder.productType === 'globeLamp') {
      formData.append('size', customOrder.lampshade.size);
      formData.append('addons', JSON.stringify(customOrder.lampshade.addons || {}));
      formData.append('notes', customOrder.lampshade.notes);
    } else if (isFamilyBundleOrder) {
      formData.append('notes', customOrder.notes || '');
    } else {
      formData.append('size', customOrder.lampshade.size);
      formData.append('panelCount', activePanelCount);
      formData.append('lightType', customOrder.lampshade.lightType);
      formData.append('addons', JSON.stringify(customOrder.lampshade.addons || {}));
      formData.append('notes', customOrder.lampshade.notes);
    }

    const nightlightAddon = customOrder.nightlightAddon || {};
    if (['cylinder', 'swappableBox5'].includes(customOrder.productType) && activeAddons.nightlight) {
      formData.append('nightlightImageSource', nightlightAddon.imageSource || 'main_existing');
      if (nightlightAddon.imageSource === 'main_existing' && Number.isInteger(nightlightAddon.selectedMainImageIndex)) {
        formData.append('nightlightSelectedMainImageIndex', nightlightAddon.selectedMainImageIndex);
      }
      if (nightlightAddon.imageSource === 'separate_upload' && nightlightAddon.separateImage) {
        formData.append('nightlightImage', nightlightAddon.separateImage);
      }
    }

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
      setUploadProgressMessage('Uploading images and preparing your custom order...');
      const idempotencyKey = getOrCreateCustomOrderIdempotencyKey();
      const response = await fetch('/api/products/custom-orders', {
        method: 'POST',
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
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
        productType: 'panel',
        images: [null],
        lampshade: {
          size: 'medium',
          panelCount: 2,
          lightType: 'led',
          addons: {
            nightlight: false,
          },
          notes: '',
        },
        cylinder: {
          size: 'medium',
          panelCount: 2,
          imageStyle: 'wrap',
          lightType: 'led',
          addons: {
            nightlight: false,
          },
          notes: '',
        },
        fixedBox4: {
          notes: '',
        },
        swappableBox5: {
          panelCount: 5,
          panelImages: [],
          extraPanelSet: false,
          lightingIncluded: false,
          addons: {
            nightlight: false,
          },
          notes: '',
        },
        nightlightAddon: {
          imageSource: 'main_existing',
          selectedMainImageIndex: 0,
          separateImage: null,
        },
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
      if (error.message && error.message.toLowerCase().includes('network')) {
        toast.error('Network error: Unable to reach the server. Please check your connection and try again.');
      } else {
        toast.error(error.message || 'Failed to submit custom order. Please try again.');
      }
    } finally {
      setIsSubmittingCustomOrder(false);
      setUploadProgressMessage('');
    }
  };

  const getProductCategories = (product) => {
    if (Array.isArray(product?.categories)) {
      return product.categories;
    }
    return product?.category ? [product.category] : [];
  };

  const isLampProduct = (productData) => {
    const sku = String(productData?.sku || '').toUpperCase();
    const categories = getProductCategories(productData);
    return ['LITHNL01', 'LITHDF01', 'LITHBUNDLE01'].includes(sku) || categories.includes('lamps');
  };

  const isLampShadeOrder = ['cylinder', 'panel', 'globeLamp'].includes(customOrder.productType);
  const isPremiumEligibleLamp = ['cylinder', 'panel', 'globeLamp'].includes(customOrder.productType);

  const normalizeProduct = (p) => {
    const basePrice = isLampProduct(p) ? getBasePriceForLamp(p, slug) : Number(p?.price || 0);
    return {
      ...p,
      name: p.name || p.title || 'Untitled',
      title: p.title || p.name || 'Untitled',
      imageGallery: Array.isArray(p.imageGallery) ? p.imageGallery.filter(Boolean) : [],
      image: p.image || p.hero_image_url || (Array.isArray(p.imageGallery) ? p.imageGallery[0] : '') || '',
      priceFormatted: p.priceFormatted || (Number.isFinite(basePrice) ? `$${basePrice.toFixed(2)}` : '$0.00'),
    };
  };

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
  const requiredPanelCount = customOrder.productType === 'familyBundle4'
    ? 4
    : customOrder.productType === 'globeLamp'
      ? 5
      : customOrder.productType === 'cylinder'
        ? clampPanelCount(customOrder.cylinder.panelCount)
        : customOrder.productType === 'fixedBox4'
          ? 4
          : customOrder.productType === 'panelBox5' || customOrder.productType === 'swappableBox5'
            ? 5
            : customOrder.productType === 'nightlight'
              ? 1
              : clampPanelCount(customOrder.lampshade.panelCount);
  const isLamp = isLampProduct(product);
  const galleryImages = getGalleryImages(normalized);
  const heroImage = galleryImages[activeImageIndex] || normalized.image;
  const customOrderTotal = (() => {
    if (customOrder.productType === 'familyBundle4') {
      return calculatePrice({ productType: 'familyBundle4' });
    }
    if (customOrder.productType === 'cylinder') {
      return calculatePrice({
        productType: 'cylinder',
        panelCount: requiredPanelCount,
        size: customOrder.cylinder.size,
        addons: customOrder.cylinder.addons,
      });
    }
    if (customOrder.productType === 'fixedBox4') {
      return calculatePrice({
        productType: 'fixedBox4',
      });
    }
    if (customOrder.productType === 'panelBox5') {
      return calculatePrice({
        productType: 'panelBox5',
      });
    }
    if (customOrder.productType === 'swappableBox5') {
      return calculatePrice({
        productType: 'panelBox5',
        addons: customOrder.swappableBox5.addons,
      });
    }
    if (customOrder.productType === 'globeLamp') {
      return calculatePrice({
        productType: 'globeLamp',
        size: customOrder.lampshade.size,
        addons: customOrder.lampshade.addons,
      });
    }
    if (customOrder.productType === 'nightlight') {
      return calculatePrice({
        productType: 'nightlight',
      });
    }
    return calculatePrice({
      productType: 'panel',
      panelCount: requiredPanelCount,
      size: customOrder.lampshade.size,
      addons: customOrder.lampshade.addons,
    });
  })();

  const formattedDeposit = `$${(customOrderTotal * 0.5).toFixed(2)}`;

  const getProductLabel = () => {
    switch (customOrder.productType) {
      case 'familyBundle4':
        return 'Bundle';
      case 'cylinder':
        return 'Lamp';
      case 'fixedBox4':
      case 'panelBox5':
      case 'swappableBox5':
        return 'Box';
      case 'globeLamp':
        return 'Globe Lamp';
      case 'nightlight':
        return 'Night Light';
      default:
        return 'Custom Order';
    }
  };

  const getCtaLabel = () => {
    const label = getProductLabel();
    return `🔥 Start My Custom ${label}`;
  };

  const getHeroStartText = () => {
    const label = getProductLabel().toLowerCase();
    return `🔥 Start your custom ${label} for just ${formattedDeposit} today`;
  };

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

      {customOrder.productType === 'cylinder' && (
        <section className="product-detail-hero-section">
          <div className="product-detail-hero-copy">
            <p className="product-detail-hero-eyebrow">Custom lamp from your photos</p>
            <h1 className="product-detail-hero-title">Turn Your Favorite Photos Into a Glowing Custom Lamp</h1>
            <p className="product-detail-hero-text">
              Bring your memories to life with a handcrafted lithophane lamp made from your own images.
            </p>
            <div className="product-detail-hero-bullets">
              <span>Made from your photos</span>
              <span>Beautiful glow in the dark</span>
              <span>One-of-a-kind custom build</span>
            </div>
            <div className="product-detail-hero-price">{getHeroStartText()}</div>
          </div>
        </section>
      )}

      {customOrder.productType === 'familyBundle4' && (
        <section className="product-detail-hero-section">
          <div className="product-detail-hero-copy">
            <p className="product-detail-hero-eyebrow">Best value custom photo set</p>
            <h1 className="product-detail-hero-title">
              Build a Complete Custom Lamp Set From Your Favorite Photos
            </h1>
            <p className="product-detail-hero-text">
              Create a matching custom photo bundle designed to glow beautifully and make an unforgettable gift.
            </p>
            <div className="product-detail-hero-bullets">
              <span>Includes multiple matching custom pieces</span>
              <span>Made from your uploaded photos</span>
              <span>Best value for families, memorials, and gifts</span>
            </div>
            <div className="product-detail-hero-price">{getHeroStartText()}</div>
            <div className="product-detail-hero-subprice">
              Full bundle total: {Number.isFinite(customOrderTotal) ? `$${customOrderTotal.toFixed(2)}` : '$0.00'}
            </div>
          </div>
        </section>
      )}

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
          {customOrder.productType === 'cylinder' ? (
            <h2 className="product-detail-title">{normalized.title}</h2>
          ) : (
            <h1 className="product-detail-title">{normalized.title}</h1>
          )}
          {customOrder.productType === 'nightlight' ? (
            <div className="product-detail-lamp-tagline">
              A compact glowing photo display made for desks, shelves, and bedside tables.
            </div>
          ) : isLampShadeOrder ? (
            <div className="product-detail-lamp-tagline">
              A custom lithophane memory lamp shade handcrafted from your photos. Includes photo review, quality checks, and a 50% deposit to begin.
            </div>
          ) : isLamp && (
            <div className="product-detail-lamp-tagline">
              Made from your photos. Designed to glow with your lamp base.
            </div>
          )}
          <div className="product-detail-price">
            {customOrder.productType === 'cylinder' && Number.isFinite(customOrderTotal)
              ? `$${customOrderTotal.toFixed(2)}`
              : normalized.priceFormatted}
          </div>
          {customOrder.productType === 'cylinder' && (
            <div className="product-detail-price-subtext">
              {getHeroStartText()}
            </div>
          )}
          <div className={`product-detail-availability ${availability.className}`}>
            {availability.text}
          </div>

          {customOrder.productType === 'familyBundle4' && (
            <div className="product-detail-trust-strip">
              <span>⭐ Best value bundle</span>
              <span>✔ Secure checkout (Stripe)</span>
              <span>✔ Handmade to order</span>
              <span>✔ Perfect for gifts and keepsakes</span>
            </div>
          )}

          {customOrder.productType === 'familyBundle4' && (
            <div className="product-detail-bundle-overview">
              <div className="product-detail-section-title">What’s Included</div>
              <ul className="product-detail-bundle-list">
                <li>2 matching lithophane lamps</li>
                <li>4 matching night lights</li>
                <li>2 diffuser inserts</li>
                <li>Coordinated family display set</li>
              </ul>
              <div className="product-detail-section-title">Why Choose the Bundle</div>
              <ul className="product-detail-bundle-list">
                <li>Better value than ordering pieces separately</li>
                <li>Matching style across all items</li>
                <li>Great for family photo displays</li>
                <li>Ideal for gifts, memorials, and special occasions</li>
              </ul>
              <div className="product-detail-section-title">How It Works</div>
              <ol className="product-detail-bundle-step-list">
                <li>Upload your 4 photos</li>
                <li>We turn them into a coordinated custom set</li>
                <li>We print and ship your bundle</li>
              </ol>
            </div>
          )}

          {isLamp && (
            <div className="product-detail-upload-guidance">
              <div className="product-detail-section-title">Photo Upload Guidance</div>
              <ul>
                <li>Upload clear, high-resolution images (3000px or larger recommended).</li>
                <li>Use well-lit, in-focus photos with good contrast for best lithophane detail.</li>
                <li>JPG/PNG images are recommended. Avoid screenshots, social-media overlays, or text-heavy images.</li>
                <li>For multi-panel orders, match each photo to the panel order shown on screen.</li>
              </ul>
              <div className="product-detail-custom-helper" style={{ marginTop: '12px' }}>
                Expected production time: 7–10 business days after deposit. We verify each image before printing.
              </div>
            </div>
          )}

          {/* Highlights */}
          <ul className="product-detail-highlights">
            {productContent.highlights.map((highlight, idx) => (
              <li key={`${highlight}-${idx}`}>{highlight}</li>
            ))}
          </ul>

          {customOrder.productType === 'cylinder' && (
            <div className="product-detail-trust-strip">
              <span>⭐ 4.9/5 from early customers</span>
              <span>✔ Secure checkout (Stripe)</span>
              <span>✔ Handmade to order</span>
              <span>✔ Ships in 3–7 days</span>
            </div>
          )}

          {/* Add to Cart Actions or Custom Order Form */}
          {isLamp ? (
            <div className="product-detail-custom-order">
              <div className="product-detail-custom-order-title">
                {customOrder.productType === 'fixedBox4'
                  ? 'Lithophane Box Lamp – 4-Sided'
                  : customOrder.productType === 'panelBox5'
                    ? 'Five-Sided Lithophane Panel Box'
                    : customOrder.productType === 'globeLamp'
                      ? 'Lithophane Globe Lamp'
                      : customOrder.productType === 'cylinder'
                        ? 'Custom Lithophane Cylinder Lamp'
                        : customOrder.productType === 'familyBundle4'
                          ? 'CUSTOM FAMILY LITHOPHANE BUNDLE'
                          : customOrder.productType === 'nightlight'
                            ? 'Custom Lithophane Night Light'
                            : 'Custom Multi-Panel Lithophane Display'}
              </div>
              <div className="product-detail-custom-note">
                {customOrder.productType === 'fixedBox4'
                  ? 'A 4-sided lithophane box with a removable lid.'
                  : customOrder.productType === 'panelBox5'
                    ? 'A five-sided panel box with a removable lid.'
                    : customOrder.productType === 'globeLamp'
                      ? 'A globe-style lithophane lamp made from your photos.'
                      : customOrder.productType === 'cylinder'
                        ? 'A custom lithophane memory lamp shade handcrafted to glow beautifully in your home.'
                        : customOrder.productType === 'familyBundle4'
                          ? 'A premium family bundle with matching lamps, night lights, and diffusers, handcrafted from your photos.'
                          : customOrder.productType === 'nightlight'
                            ? 'A compact lithophane night light made from your photo.'
                            : 'A custom multi-panel lithophane display made from your photos.'}
              </div>
              <p className="product-detail-custom-order-copy">
                {customOrder.productType === 'fixedBox4'
                  ? 'Upload your photos and we will craft a four-sided lithophane box with a removable lid.'
                  : customOrder.productType === 'panelBox5'
                    ? 'Upload your photos and we will craft a five-sided panel box with a removable lid.'
                    : customOrder.productType === 'globeLamp'
                      ? 'Upload up to 5 images to wrap around your globe lamp. Use a moon background to fill unused sections for a unique ambient look.'
                      : customOrder.productType === 'familyBundle4' ? (
                        <>
                          Upload 4 photos and we’ll create a premium custom bundle with matching lamps, night lights, and diffuser inserts.<br />
                          Each image is used across the full set to create a coordinated family keepsake.<br />
                          Perfect for gifts, memorials, and special celebrations.
                        </>
                      ) : customOrder.productType === 'nightlight' ? (
                        'Upload one photo and we will create a compact glowing photo night light from your image. Ideal for desks, shelves, and bedside tables.'
                      ) : 'Upload your favorite photos and we will craft a glowing custom lamp that looks stunning on any shelf or bedside table.'}
              </p>
              {isPremiumEligibleLamp && (
                <div className="product-detail-premium-offer">
                  <div className="product-detail-section-title">Premium Memory Lamp Package</div>
                  <p>
                    A premium build for gift-ready keepsakes, memorials, and high-impact displays. Large shade + RGB + diffuser + up to 3 images, with expert photo review and premium finishing.
                  </p>
                  <ul className="product-detail-premium-list">
                    <li>Large shade from about $100</li>
                    <li>RGB + diffuser bundle included</li>
                    <li>Up to 3 images/panels</li>
                    <li>Photo review before printing</li>
                    <li>Gift-ready finishing and premium polish</li>
                  </ul>
                </div>
              )}
              {isLampShadeOrder && (
                <div className="product-detail-size-tier-block">
                  <div className="product-detail-section-title">Choose Your Size</div>
                  <div className="product-detail-size-grid">
                    <div>
                      <strong>Small — $45</strong><br />
                      100mm top / 150mm bottom / 150mm tall
                    </div>
                    <div>
                      <strong>Medium — $60</strong><br />
                      150mm top / 200mm bottom / 200mm tall
                    </div>
                    <div>
                      <strong>Large — $75</strong><br />
                      200mm top / 250mm bottom / 250mm tall
                    </div>
                  </div>
                </div>
              )}
              {customOrder.productType === 'cylinder' && (
                <div className="product-detail-cylinder-summary-block">
                  <div className="product-detail-section-title">How It Works</div>
                  <ol className="product-detail-cylinder-step-list">
                    <li>Upload your photos</li>
                    <li>We convert them into a custom 3D design</li>
                    <li>We print and ship your lamp</li>
                  </ol>

                  <div className="product-detail-section-title">Perfect For</div>
                  <ul className="product-detail-cylinder-feature-list">
                    <li>Gifts</li>
                    <li>Memorials</li>
                    <li>Pet tributes</li>
                    <li>Family memories</li>
                  </ul>

                  <div className="product-detail-section-title">What You Get</div>
                  <ul className="product-detail-cylinder-feature-list">
                    <li>Custom lithophane lamp shade</li>
                    <li>Designed from your uploaded images</li>
                    <li>Optimized for glow and detail</li>
                    <li>Ready for standard lighting</li>
                  </ul>
                </div>
              )}

              {customOrderResult && (
                <div className="product-detail-custom-success">
                  <h3>Order started</h3>
                  <p>
                    Your custom order <strong>{customOrderResult.orderId}</strong> has been created.
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

              {customOrder.productType !== 'familyBundle4' && (
                <div className="product-detail-custom-field">
                  <label className="product-detail-custom-label">
                    {customOrder.productType === 'nightlight' ? 'Upload Your Photo' : 'Upload Photos'}
                  </label>
                  <p className="product-detail-custom-helper">
                    {customOrder.productType === 'cylinder'
                      ? 'Use clear, high-quality images. Portraits work best. Upload 2–5 photos.'
                      : customOrder.productType === 'globeLamp'
                        ? 'Upload up to 5 images to wrap around your globe lamp. Use a moon background to fill unused sections for a unique ambient look.'
                        : customOrder.productType === 'nightlight'
                          ? 'Upload one photo for your custom night light.'
                          : 'Upload one image per panel in the order you want them displayed.'}
                  </p>
                  <p className="product-detail-custom-helper" style={{ fontStyle: 'italic', marginTop: '6px' }}>
                    {RECOMMENDED_UPLOAD_TEXT} Max 10 MB per file.
                  </p>
                  {uploadError && (
                    <div className="product-detail-custom-error" style={{ marginTop: '10px' }}>
                      {uploadError}
                    </div>
                  )}
                  {customOrder.productType === 'nightlight' && (
                    <React.Fragment>
                      <div className="product-detail-photo-check-block">
                        <div className="product-detail-section-title">Photo Quality Check</div>
                        <p>
                          We review every uploaded image before printing. If a photo is too dark, blurry, or poorly composed, we’ll contact you before production to make sure your keepsake looks its best.
                        </p>
                        <Link to="/chat" className="product-detail-free-photo-check-cta">
                          Get a Free Photo Check
                        </Link>
                      </div>
                      <div className="product-detail-panel-upload-block">
                        <div className="product-detail-panel-upload-label">Night Light Photo</div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            handlePanelImageUpload(0, file);
                          }}
                          className="product-detail-custom-file"
                        />
                        {customOrder.images[0] && (
                          <div className="product-detail-custom-preview">
                            <img
                              src={URL.createObjectURL(customOrder.images[0])}
                              alt="Night light preview"
                              className="product-detail-custom-preview-img"
                            />
                            <div className="product-detail-custom-filename">
                              {customOrder.images[0].name}
                            </div>
                            <button
                              type="button"
                              className="product-detail-custom-remove"
                              onClick={() => handleRemovePanelImage(0)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  )}
                  {customOrder.productType !== 'nightlight' && (
                    <React.Fragment>
                      <div className="product-detail-photo-check-block">
                        <div className="product-detail-section-title">Photo Quality Check</div>
                        <p>
                          We review every uploaded image before printing. If a photo is too dark, blurry, or poorly composed, we’ll contact you before production to make sure your keepsake looks its best.
                        </p>
                        <Link to="/chat" className="product-detail-free-photo-check-cta">
                          Get a Free Photo Check
                        </Link>
                      </div>
                      {Array.from({ length: requiredPanelCount }, (_, index) => (
                        <div key={`panel-${requiredPanelCount}-${index}`} className="product-detail-panel-upload-block">
                          <div className="product-detail-panel-upload-label">
                            {customOrder.productType === 'cylinder'
                              ? `Photo ${index + 1}`
                              : customOrder.productType === 'globeLamp'
                                ? `Image ${index + 1}`
                                : `Panel ${index + 1}`}
                          </div>
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
                                alt={`${customOrder.productType === 'globeLamp' ? 'Image' : 'Panel'} ${index + 1} Preview`}
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
                    </React.Fragment>
                  )}
                </div>
              )}

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

              <div className="product-detail-configurator" key={customOrder.productType}>
                {customOrder.productType === 'cylinder' ? (
                  <CylinderConfigurator
                    cylinder={customOrder.cylinder}
                    onSizeChange={(value) => updateCylinder({ size: value })}
                    onPanelCountChange={(value) => {
                      const nextCount = clampPanelCount(value);
                      setCustomOrder((prev) => {
                        const nextImages = [...(prev.images || [])].slice(0, nextCount);
                        while (nextImages.length < nextCount) {
                          nextImages.push(null);
                        }
                        return {
                          ...prev,
                          images: nextImages,
                          cylinder: {
                            ...prev.cylinder,
                            panelCount: nextCount,
                          },
                        };
                      });
                    }}
                    onImageStyleChange={(value) => updateCylinder({ imageStyle: value })}
                    onLightTypeChange={(value) => updateCylinder({ lightType: value })}
                    onToggleAddon={(value) => toggleAddon('cylinder', value)}
                    onNotesChange={(value) => updateCylinder({ notes: value })}
                  />
                ) : requiresBoxConfigurator(customOrder.productType) ? (
                  <BoxConfigurator
                    box={customOrder.fixedBox4}
                    onNotesChange={(value) => updateFixedBox4({ notes: value })}
                  />
                ) : customOrder.productType === 'swappableBox5' ? (
                  <SwappableBoxConfigurator
                    swappableBox={customOrder.swappableBox5}
                    onExtraPanelSetChange={(value) => updateSwappableBox5({ extraPanelSet: value })}
                    onLightingIncludedChange={(value) => updateSwappableBox5({ lightingIncluded: value })}
                    onToggleAddon={(value) => toggleAddon('swappableBox5', value)}
                    onNotesChange={(value) => updateSwappableBox5({ notes: value })}
                  />
                ) : customOrder.productType === 'globeLamp' ? (
                  <GlobeLampConfigurator
                    lampshade={customOrder.lampshade}
                    onSizeChange={(value) => updateLampshade({ size: value })}
                    onToggleAddon={(value) => toggleAddon('lampshade', value)}
                    onNotesChange={(value) => updateLampshade({ notes: value })}
                  />
                ) : customOrder.productType === 'familyBundle4' ? (
                  <FamilyBundleConfigurator
                    images={customOrder.images}
                    onImageUpload={handleBundleImageUpload}
                    onRemoveImage={handleRemoveBundleImage}
                    notes={customOrder.notes}
                    onNotesChange={(value) => setCustomOrder((prev) => ({ ...prev, notes: value }))}
                  />
                ) : customOrder.productType === 'nightlight' ? null : (
                  <PanelConfigurator
                    lampshade={customOrder.lampshade}
                    onSizeChange={(value) => updateLampshade({ size: value })}
                    onPanelCountChange={(value) => {
                      const nextCount = clampPanelCount(value);
                      setCustomOrder((prev) => {
                        const nextImages = [...(prev.images || [])].slice(0, nextCount);
                        while (nextImages.length < nextCount) {
                          nextImages.push(null);
                        }
                        return {
                          ...prev,
                          images: nextImages,
                          lampshade: {
                            ...prev.lampshade,
                            panelCount: nextCount,
                          },
                        };
                      });
                    }}
                    onLightTypeChange={(value) => updateLampshade({ lightType: value })}
                    onToggleAddon={(value) => toggleAddon('lampshade', value)}
                    onNotesChange={(value) => updateLampshade({ notes: value })}
                    showSize={false}
                    showLightType={false}
                    showDiffuser={true}
                    showNightlight={false}
                  />
                )}
              </div>

              {isLampShadeOrder && (
                <div className="product-detail-upgrade-summary">
                  <div className="product-detail-section-title">Upgrade Your Build</div>
                  <ul className="product-detail-upgrade-list">
                    <li>Extra image/panel — +$5</li>
                    <li>Diffuser — +$10</li>
                    <li>RGB lighting — +$15</li>
                    <li>RGB + diffuser bundle — +$20 total</li>
                  </ul>
                  <div className="product-detail-custom-helper" style={{ marginTop: '8px' }}>
                    RGB and diffuser together are bundled at +$20 total, not +$25.
                  </div>
                </div>
              )}

              {['cylinder', 'swappableBox5'].includes(customOrder.productType) && activeAddons.nightlight && (
                <div className="product-detail-custom-field">
                  <label className="product-detail-custom-label">Nightlight Image</label>
                  <div className="product-detail-custom-extras">
                    <label className="product-detail-custom-radio">
                      <input
                        type="radio"
                        name="nightlightImageSource"
                        value="main_existing"
                        checked={nightlightAddon.imageSource === 'main_existing'}
                        onChange={(e) => updateNightlightAddon({
                          imageSource: e.target.value,
                          separateImage: null,
                        })}
                      />
                      Use one of my main uploaded images
                    </label>
                    <label className="product-detail-custom-radio">
                      <input
                        type="radio"
                        name="nightlightImageSource"
                        value="separate_upload"
                        checked={nightlightAddon.imageSource === 'separate_upload'}
                        onChange={(e) => updateNightlightAddon({ imageSource: e.target.value })}
                      />
                      Upload a separate image
                    </label>
                  </div>

                  {nightlightAddon.imageSource === 'main_existing' ? (
                    <div style={{ marginTop: '12px' }}>
                      <select
                        value={nightlightAddon.selectedMainImageIndex ?? ''}
                        onChange={(e) => updateNightlightAddon({ selectedMainImageIndex: Number(e.target.value) })}
                        className="product-detail-custom-select"
                        disabled={mainUploadedImages.length === 0}
                      >
                        <option value="" disabled>
                          {mainUploadedImages.length === 0 ? 'Upload main images first' : 'Select a main image'}
                        </option>
                        {mainUploadedImages.map((img, index) => (
                          <option key={index} value={index}>
                            Main Image {index + 1}{img.name ? ` — ${img.name}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ marginTop: '12px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleNightlightImageUpload(file);
                        }}
                        className="product-detail-custom-input"
                      />
                      {nightlightAddon.separateImage && (
                        <div style={{ marginTop: '8px', color: '#ccc' }}>
                          Selected file: {nightlightAddon.separateImage.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {customOrder.productType === 'cylinder' && (
                <div className="product-detail-cylinder-pricing-summary">
                  <div className="product-detail-summary-row">
                    <span>{getHeroStartText()}</span>
                    <strong>{customOrderTotal ? `$${(customOrderTotal * 0.5).toFixed(2)}` : '$0.00'}</strong>
                  </div>
                  <div className="product-detail-summary-row">
                    <span>Total price:</span>
                    <strong>{customOrderTotal ? `$${customOrderTotal.toFixed(2)}` : '$0.00'}</strong>
                  </div>
                </div>
              )}
              {customOrder.productType === 'familyBundle4' && (
                <div className="product-detail-bundle-pricing-summary">
                  <div className="product-detail-summary-row">
                    <span>Only {formattedDeposit} to start</span>
                    <strong>{customOrderTotal ? `$${(customOrderTotal * 0.5).toFixed(2)}` : '$0.00'}</strong>
                  </div>
                  <div className="product-detail-summary-row">
                    <span>Bundle total:</span>
                    <strong>{customOrderTotal ? `$${customOrderTotal.toFixed(2)}` : '$0.00'}</strong>
                  </div>
                  <div className="product-detail-summary-note">
                    Secure your custom bundle with a 50% deposit today.
                  </div>
                </div>
              )}
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
                      <strong>{customOrderTotal ? `$${customOrderTotal.toFixed(2)}` : '$0.00'}</strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Deposit Due Now (50%):</span>
                      <strong>{customOrderTotal ? `$${(customOrderTotal * 0.5).toFixed(2)}` : '$0.00'}</strong>
                    </div>
                    <div className="product-detail-summary-row">
                      <span>Remaining Balance:</span>
                      <strong>{customOrderTotal ? `$${(customOrderTotal * 0.5).toFixed(2)}` : '$0.00'}</strong>
                    </div>
                  </>
                )}
                <div className="product-detail-summary-note">
                  {customOrder.productType === 'familyBundle4'
                    ? 'Secure your custom bundle with a 50% deposit today.'
                    : 'A 50% deposit is required to begin your custom order.'}
                </div>
              </div>

              <div className="product-detail-custom-total">
                <span>Total:</span>
                <strong>{`$${customOrderTotal.toFixed(2)}`}</strong>
              </div>

              <div className="product-detail-custom-note">
                {customOrder.productType === 'familyBundle4'
                  ? 'This listing covers a complete family bundle with matching lamps, night lights, and diffuser inserts.'
                  : customOrder.productType === 'fixedBox4' || customOrder.productType === 'panelBox5'
                    ? 'This listing is for the custom lithophane box only.'
                    : customOrder.productType === 'globeLamp'
                      ? 'Designed as a globe-style lithophane lamp.'
                      : customOrder.productType === 'nightlight'
                        ? 'This listing is for a complete custom lithophane night light.'
                        : customOrder.productType === 'cylinder'
                          ? 'This listing is for the custom lithophane lamp shade only. A compatible lamp base is not included.'
                          : 'Designed for use with a compatible lamp base. This listing is for the custom shade only.'}
              </div>

              {uploadProgressMessage && (
                <div className="product-detail-custom-helper" style={{ marginBottom: '12px', color: '#b9f6ca' }}>
                  {uploadProgressMessage}
                </div>
              )}

              <button
                onClick={handleCustomOrderSubmit}
                className="product-detail-custom-submit"
                disabled={isSubmittingCustomOrder || !(
                  customOrder.productType === 'familyBundle4'
                    ? customOrder.images.filter(Boolean).length === 4
                    : customOrder.productType === 'globeLamp'
                      ? customOrder.images.filter(Boolean).length >= 1
                      : customOrder.images.slice(0, requiredPanelCount).every(Boolean)
                )}
              >
                {isSubmittingCustomOrder ? 'Processing...' : getCtaLabel()}
              </button>
              <div className="product-detail-custom-submit-note">
                Only {formattedDeposit} to begin • Secure checkout
              </div>
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
              <div key={`${indicator.text}-${idx}`} className="product-detail-trust-item">
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
            {(product.dimensions || product.dimensionsText) && (
              <div className="product-detail-meta-item">
                <div className="product-detail-meta-label">Dimensions</div>
                <div className="product-detail-meta-value">{product.dimensions || product.dimensionsText}</div>
              </div>
            )}
            {(product.materials || product.material) && (
              <div className="product-detail-meta-item">
                <div className="product-detail-meta-label">Materials</div>
                <div className="product-detail-meta-value">{product.materials || product.material}</div>
              </div>
            )}
            {(product.leadTime || product.lead_time) && (
              <div className="product-detail-meta-item">
                <div className="product-detail-meta-label">Lead Time</div>
                <div className="product-detail-meta-value">{product.leadTime || product.lead_time}</div>
              </div>
            )}
            {(product.estimatedBuildTime || product.buildTime) && (
              <div className="product-detail-meta-item">
                <div className="product-detail-meta-label">Build Time</div>
                <div className="product-detail-meta-value">{product.estimatedBuildTime || product.buildTime}</div>
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
            {(product.dimensions || product.dimensionsText) && (
              <li>Dimensions: {product.dimensions || product.dimensionsText}</li>
            )}
            {(product.materials || product.material) && (
              <li>Materials: {product.materials || product.material}</li>
            )}
            {(product.leadTime || product.lead_time) && (
              <li>Lead time: {product.leadTime || product.lead_time}</li>
            )}
            {(product.estimatedBuildTime || product.buildTime) && (
              <li>Estimated build time: {product.estimatedBuildTime || product.buildTime}</li>
            )}
            <li>Full technical support</li>
          </ul>
        </div>

        <div className="product-detail-section">
          <div className="product-detail-section-title">What's Included</div>
          <ul>
            {productContent.whatsIncluded.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="product-detail-use-cases">
        <div className="product-detail-use-cases-title">Use Cases & Applications</div>
        <ul>
          {productContent.useCases.map((useCase, idx) => (
            <li key={`${useCase}-${idx}`}>{useCase}</li>
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