import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveImageUrl, DEFAULT_PLACEHOLDER } from '../utils/resolveImageUrl';
import { calculatePrice } from '../utils/pricing';
import { storeFallbackProducts } from '../storeFallbackProducts';
import { getProductImage, getProductImageFallback } from '../productImageFallbacks';

const FALLBACK_PRODUCTS = storeFallbackProducts;

const PRODUCT_SLUG_BY_SKU = {
  LITHCYL01: 'custom-lithophane-lamp-cylinder',
  LITHMUL02: 'multi-panel-lithophane-lamp',
  LITHBOX03: 'lithophane-box',
  LITHBOX05: 'five-sided-lithophane-panel-box',
  LITHGLB04: 'lithophane-globe-lamp',
  LITHBUNDLE01: 'custom-family-lithophane-bundle',
  LITHNL01: 'lithophane-night-light',
  LITHDF01: 'lithophane-diffuser-insert',
};

const normalizeSlugKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const PRODUCT_SLUG_BY_TITLE = {
  'custom-lithophane-lamp-cylinder': 'custom-lithophane-lamp-cylinder',
  'multi-panel-lithophane-lamp': 'multi-panel-lithophane-lamp',
  'lithophane-box': 'lithophane-box',
  'five-sided-lithophane-panel-box': 'five-sided-lithophane-panel-box',
  'lithophane-globe-lamp': 'lithophane-globe-lamp',
  'custom-family-lithophane-bundle': 'custom-family-lithophane-bundle',
  'lithophane-night-light': 'lithophane-night-light',
  'lithophane-diffuser-insert': 'lithophane-diffuser-insert',
};

const getPublicProductSlug = (product) => {
  const skuSlug = PRODUCT_SLUG_BY_SKU[String(product.sku || '').toUpperCase()];
  if (skuSlug) return skuSlug;

  const titleSlug = PRODUCT_SLUG_BY_TITLE[normalizeSlugKey(product.title || product.name)];
  if (titleSlug) return titleSlug;

  const rawSlug = String(product.slug || '').trim();
  if (/^https?:\/\//i.test(rawSlug) || rawSlug.includes('localhost') || rawSlug.includes('127.0.0.1')) {
    return titleSlug || normalizeSlugKey(product.title || product.name);
  }

  return rawSlug || normalizeSlugKey(product.title || product.name);
};

const getLampBasePrice = (product) => {
  const sku = String(product.sku || '').toUpperCase();
  if (sku === 'LITHCYL01') {
    return calculatePrice({ productType: 'cylinder', panelCount: 2, size: 'small' });
  }
  if (sku === 'LITHMUL02') {
    return calculatePrice({ productType: 'panel', panelCount: 2, size: 'small' });
  }
  if (sku === 'LITHBOX03') {
    return calculatePrice({ productType: 'fixedBox4' });
  }
  if (sku === 'LITHBOX05') {
    return calculatePrice({ productType: 'panelBox5' });
  }
  if (sku === 'LITHGLB04') {
    return calculatePrice({ productType: 'globeLamp', size: 'small' });
  }
  if (sku === 'LITHBUNDLE01') {
    return calculatePrice({ productType: 'familyBundle4' });
  }
  if (sku === 'LITHNL01') {
    return calculatePrice({ productType: 'nightlight' });
  }
  return null;
};

const lampsOnlySkus = ['LITHNL01', 'LITHDF01', 'LITHBUNDLE01'];

const getProductCategories = (product) => {
  if (Array.isArray(product.categories)) {
    return product.categories;
  }
  return product.category ? [product.category] : [];
};

const isLampProduct = (product) => {
  const sku = String(product.sku || '').toUpperCase();
  const categories = getProductCategories(product);
  return lampsOnlySkus.includes(sku) || categories.includes('lamps');
};

const normalizeProduct = (product) => {
  const categories = getProductCategories(product);
  const baseLampPrice = isLampProduct(product) ? getLampBasePrice(product) : null;
  const price = Number(baseLampPrice ?? product.price);
  const gallery = Array.isArray(product.imageGallery)
    ? product.imageGallery.filter(Boolean)
    : [];
  const heroImage = getProductImage({ ...product, imageGallery: gallery });
  return {
    ...product,
    slug: getPublicProductSlug(product),
    categories,
    name: product.name || product.title || 'Untitled product',
    image: heroImage,
    imageGallery: gallery,
    priceFormatted: Number.isFinite(price) ? `$${price.toFixed(2)}` : product.priceFormatted || '$0.00',
  };
};

const getImageSrc = (image) => resolveImageUrl(image);

const handleProductImageError = (event, product) => {
  const fallback = resolveImageUrl(getProductImageFallback(product));
  if (fallback && event.currentTarget.src !== new URL(fallback, window.location.origin).href) {
    event.currentTarget.src = fallback;
    return;
  }
  event.currentTarget.src = DEFAULT_PLACEHOLDER;
};

const isPublicStoreProduct = (product) => {
  const slug = String(product?.slug || '').toLowerCase();
  const title = String(product?.title || product?.name || '').toLowerCase();
  return !(
    product?.isPrivatePayment === true ||
    String(product?.category || '').toLowerCase() === 'custom-payment' ||
    slug.includes('final-payment') ||
    title.includes('final payment')
  );
};

const getProductCardMeta = (product) => {
  const sku = String(product.sku || '').toUpperCase();
  const isCustomKeepsake = ['LITHCYL01', 'LITHMUL02', 'LITHGLB04', 'LITHBOX03', 'LITHBOX05', 'LITHBUNDLE01', 'LITHNL01'].includes(sku);
  const isSimpleAddOn = ['LITHDF01'].includes(sku);
  const isBundle = sku === 'LITHBUNDLE01';

  const microcopyMap = {
    LITHCYL01: 'Turn your photos into a glowing keepsake',
    LITHMUL02: 'Wrap multiple memories into one custom lamp',
    LITHGLB04: 'A glowing photo lamp with a unique round display',
    LITHBOX03: 'Custom photo box that glows from within',
    LITHBOX05: 'More photo space in a premium keepsake box',
    LITHBUNDLE01: 'Best-value custom family keepsake set',
    LITHNL01: 'Small glowing keepsake made from your photo',
    LITHDF01: 'Add a softer, cleaner glow to your display',
  };

  const defaultMicrocopy = product.category === 'tools'
    ? 'Security hardware built for professionals'
    : product.category === 'surface'
      ? 'High-quality 3D model assets ready for your workflow'
      : 'Reliable gear for HexForge users';

  const badge = isBundle
    ? 'Best Value'
    : isCustomKeepsake
      ? 'Custom Order'
      : isSimpleAddOn
        ? 'Ready to Order'
        : '';

  const cta = isBundle
    ? 'Build My Bundle'
    : isCustomKeepsake
      ? 'Start Custom Order'
      : 'View Details';

  const pricePrefix = isCustomKeepsake ? 'Starts at ' : '';
  const priceNote = isCustomKeepsake ? '50% deposit at checkout' : '';

  return {
    badge,
    microcopy: microcopyMap[sku] || (isCustomKeepsake ? 'Handmade custom keepsake from your photos' : defaultMicrocopy),
    cta: product.isStoreFallback ? 'View Details' : cta,
    pricePrefix,
    priceNote,
    isCustomKeepsake,
    isSimpleAddOn,
    isBundle,
  };
};

const ProductSection = ({ title, subtitle, products }) => {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: '60px' }}>
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#00ffc8',
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            fontSize: '16px',
            color: '#ccc',
            marginBottom: '30px',
            maxWidth: '600px',
            margin: '0 auto 30px auto',
            lineHeight: '1.5'
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Products Grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '20px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {products.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', color: '#ccc', marginTop: '40px' }}>
            <h3>No products found</h3>
            <p>Try clearing your search or selecting another category.</p>
          </div>
        ) : (
          products.map((product) => {
          const meta = getProductCardMeta(product);
          const cardHighlight = product.sku?.toUpperCase() === 'LITHBUNDLE01' ? {
            boxShadow: '0 0 20px rgba(255, 209, 102, 0.25)',
            border: '1px solid rgba(255, 209, 102, 0.45)',
          } : {};
          return (
            <div
              key={product._id}
              className="product-card"
              style={{
                width: '220px',
                minHeight: '360px',
                margin: '10px',
                backgroundColor: '#111',
                padding: '15px',
                borderRadius: '12px',
                color: '#fff',
                textAlign: 'center',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                ...cardHighlight,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 200, 0.3)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Link to={`/store/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ position: 'relative' }}>
                  {meta.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '4px 9px',
                        borderRadius: '999px',
                        background: 'rgba(255, 209, 102, 0.18)',
                        border: '1px solid rgba(255, 209, 102, 0.35)',
                        color: '#ffd166',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.7px',
                      }}
                    >
                      {meta.badge}
                    </div>
                  )}
                  <img
                    src={getImageSrc(product.image)}
                    alt={product.name}
                    onError={(event) => handleProductImageError(event, product)}
                    style={{ width: '100%', height: 'auto', borderRadius: '10px', marginBottom: '14px' }}
                  />
                </div>
              </Link>

              <div>
                <Link to={`/store/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 style={{ fontSize: '18px', margin: '10px 0 8px', lineHeight: '1.2', minHeight: '48px' }}>{product.name}</h3>
                </Link>
                <p style={{ fontSize: '13px', color: '#ccc', minHeight: '42px', margin: '0 0 12px' }}>
                  {meta.microcopy}
                </p>
                <p style={{ fontSize: '14px', color: '#fff', margin: '0 0 6px', fontWeight: '600' }}>
                  {meta.pricePrefix}{product.priceFormatted}
                </p>
                {meta.priceNote && (
                  <p style={{ fontSize: '12px', color: '#e9c89a', margin: '0 0 14px' }}>
                    {meta.priceNote}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  if (product.isStoreFallback) {
                    navigate(`/store/${product.slug}`);
                    return;
                  }
                  if (meta.isCustomKeepsake) {
                    navigate(`/store/${product.slug}`);
                    return;
                  }
                  navigate(`/store/${product.slug}`);
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: meta.isCustomKeepsake ? '#00ffc8' : '#ffd166',
                  border: 'none',
                  borderRadius: '8px',
                  color: meta.isCustomKeepsake ? '#000' : '#111',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {meta.cta}
              </button>
              {meta.isCustomKeepsake && (
                <button
                  onClick={() => navigate(`/free-photo-check?product=${encodeURIComponent(product.slug)}`)}
                  style={{
                    padding: '9px 14px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(0, 255, 200, 0.55)',
                    borderRadius: '8px',
                    color: '#9fffe8',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Request Free Photo Check
                </button>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
};

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
        const normalized = list.filter(isPublicStoreProduct).map(normalizeProduct);
        setProducts(normalized.length ? normalized : FALLBACK_PRODUCTS.map(normalizeProduct));
      } catch (err) {
        console.error('❌ Error fetching products:', err);
        setError(true);
        setProducts(FALLBACK_PRODUCTS.map(normalizeProduct));
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleFilterChange = (newFilter) => {
    if (newFilter !== activeFilter) {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveFilter(newFilter);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const getFilteredProducts = () => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const inSearch = (product) => {
      if (!normalizedSearch) return true;
      const text = `${product.name || ''} ${product.description || ''} ${product.category || ''} ${product.sku || ''}`.toLowerCase();
      return text.includes(normalizedSearch);
    };

    switch (activeFilter) {
      case 'tech':
        return products.filter((p) => {
          const categories = getProductCategories(p);
          return !isLampProduct(p) && !categories.includes('surface') && inSearch(p);
        });
      case 'lamps':
        return products.filter((p) => isLampProduct(p) && inSearch(p));
      case 'all':
      default:
        return products.filter((p) => {
          const categories = getProductCategories(p);
          return !categories.includes('surface') && inSearch(p);
        });
    }
  };

  const getTechProducts = () => {
    return getFilteredProducts().filter((p) => {
      const categories = getProductCategories(p);
      return !isLampProduct(p) && !categories.includes('surface');
    });
  };

  const getLampProducts = () => {
    return getFilteredProducts().filter((p) => isLampProduct(p));
  };

  const getSectionTitle = () => {
    switch (activeFilter) {
      case 'tech':
        return 'Tools & Devices';
      case 'lamps':
        return 'Custom Lamps & Prints';
      case 'all':
      default:
        return 'HexForge Store';
    }
  };

  const getSectionSubtitle = () => {
    switch (activeFilter) {
      case 'tech':
        return 'Security tools, devices, and lab gear from HexForge Labs.';
      case 'lamps':
        return 'Turn favorite photos into warm, glowing keepsakes made to gift and treasure.';
      case 'all':
      default:
        return null;
    }
  };

  const spinnerKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      0% { opacity: 0; transform: translateX(-20px); }
      100% { opacity: 1; transform: translateX(0); }
    }
  `;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <style>{spinnerKeyframes}</style>
        <div style={{
          display: 'inline-block',
          width: '80px',
          height: '80px',
        }}>
          <div style={{
            display: 'block',
            width: '64px',
            height: '64px',
            margin: '8px auto',
            borderRadius: '50%',
            border: '8px solid #00ffc8',
            borderColor: '#00ffc8 transparent #00ffc8 transparent',
            animation: 'spin 1.2s linear infinite',
          }}></div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '18px', color: '#00ffc8' }}>
          Loading Products...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Main Section Header - Only show for 'all' filter */}
      {activeFilter === 'all' && (
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: '#00ffc8', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {getSectionTitle()}
          </h1>
          {getSectionSubtitle() && (
            <p style={{ 
              fontSize: '16px', 
              color: '#ccc', 
              marginBottom: '30px',
              maxWidth: '600px',
              margin: '0 auto 30px auto',
              lineHeight: '1.5'
            }}>
              {getSectionSubtitle()}
            </p>
          )}
        </div>
      )}

      {/* Filter Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '40px',
        gap: '10px'
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'tech', label: 'Tech' },
          { key: 'lamps', label: 'Lamps' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            style={{
              padding: '12px 24px',
              backgroundColor: activeFilter === key ? '#00ffc8' : '#1a1a1a',
              color: activeFilter === key ? '#000' : '#fff',
              border: `2px solid ${activeFilter === key ? '#00ffc8' : '#333'}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseEnter={(e) => {
              if (activeFilter !== key) {
                e.currentTarget.style.backgroundColor = '#333';
                e.currentTarget.style.borderColor = '#555';
              }
            }}
            onMouseLeave={(e) => {
              if (activeFilter !== key) {
                e.currentTarget.style.backgroundColor = '#1a1a1a';
                e.currentTarget.style.borderColor = '#333';
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ width: '100%', textAlign: 'center', marginBottom: '20px', color: '#ffb347' }}>
          Live catalog unavailable. Showing fallback products.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products, lamps, and tools"
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '14px 18px',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: '#111',
            color: '#fff',
            outline: 'none',
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              padding: '14px 18px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '999px',
              cursor: 'pointer',
              fontWeight: '700',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Products Sections */}
      <div style={{
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateY(20px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
      }}>
        {activeFilter === 'all' ? (
          <div>
            {/* Tools & Devices Section */}
            <ProductSection
              title="Tools & Devices"
              subtitle="Security tools, devices, and lab gear from HexForge Labs."
              products={getTechProducts()}
            />

            {/* Custom Lamps & Prints Section */}
            <ProductSection
              title="Custom Lamps & Prints"
              subtitle="Turn your photos into custom illuminated prints and keepsakes."
              products={getLampProducts()}
            />
          </div>
        ) : (
          <ProductSection
            title={getSectionTitle()}
            subtitle={getSectionSubtitle()}
            products={getFilteredProducts()}
          />
        )}
      </div>
    </div>
  );
}

export default ProductList;
