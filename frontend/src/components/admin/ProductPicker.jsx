import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/apiBase';
import './ProductPicker.css';

const formatPrice = (price) => {
  if (typeof price === 'number') return `$${price.toFixed(2)}`;
  if (typeof price === 'string' && price.trim()) return price;
  return '$0.00';
};

const ProductPicker = ({
  selectedSlugs = [],
  onAddProduct,
  onClose,
  title = 'Choose Featured Product',
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/products`, {
        withCredentials: true,
      });

      if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
        setError('Unexpected response from product API.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const selectedSet = useMemo(
    () => new Set(selectedSlugs.map((slug) => String(slug || '').toLowerCase().trim())),
    [selectedSlugs]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const visibleProducts = products.filter((product) => !product.isPrivatePayment);
    if (!normalizedQuery) return visibleProducts;
    return visibleProducts.filter((product) => {
      const title = String(product.title || product.name || '').toLowerCase();
      const slug = String(product.slug || '').toLowerCase();
      const category = String(product.category || '').toLowerCase();
      return (
        title.includes(normalizedQuery) ||
        slug.includes(normalizedQuery) ||
        category.includes(normalizedQuery)
      );
    });
  }, [products, query]);

  const getThumbnail = (product) => {
    return (
      product.hero_image_url ||
      product.image ||
      (Array.isArray(product.imageGallery) && product.imageGallery[0]) ||
      '/images/products/litho-cylinder/hero-main.jpg'
    );
  };

  return (
    <div className="product-picker-backdrop" role="dialog" aria-modal="true">
      <div className="product-picker-modal">
        <div className="product-picker-header">
          <div>
            <h2>{title}</h2>
            <p className="picker-help-text">
              Select a product to feature on the homepage. Products already included in the featured list are disabled.
            </p>
          </div>
          <button type="button" className="action-button secondary-button close-modal-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="product-picker-search-row">
          <label className="form-label" htmlFor="product-picker-search">
            Search products
          </label>
          <input
            id="product-picker-search"
            className="form-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products by title, slug, or category…"
          />
        </div>

        {loading ? (
          <div className="product-picker-loading">
            <p>Loading products…</p>
          </div>
        ) : error ? (
          <div className="product-picker-error">
            <p>Could not load products.</p>
            <p>{error}</p>
            <button type="button" className="action-button primary-button" onClick={loadProducts}>
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="product-picker-empty">
            <p>No products match your search.</p>
          </div>
        ) : (
          <div className="product-picker-results">
            <div className="product-picker-grid">
              {filteredProducts.map((product) => {
                const slug = String(product.slug || '').trim();
                const isSelected = selectedSet.has(slug.toLowerCase());
                return (
                  <div key={slug || product._id} className="product-card">
                    <div className="product-card-thumb">
                      <img
                        src={getThumbnail(product)}
                        alt={product.title || slug || 'Product image'}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                          event.currentTarget.parentElement?.classList.add('product-thumb-error');
                        }}
                      />
                    </div>
                    <div className="product-card-body">
                      <div className="product-card-title">{product.title || product.name || 'Untitled product'}</div>
                      <div className="product-card-meta">
                        <strong>Slug:</strong> {slug || 'n/a'}
                      </div>
                      <div className="product-card-meta">
                        <strong>Category:</strong> {product.category || 'uncategorized'}
                      </div>
                      <div className="product-card-meta">
                        <strong>Price:</strong> {formatPrice(product.price || product.priceFormatted)}
                      </div>
                      <div className="product-card-meta">
                        <strong>Status:</strong> {product.status || 'unknown'}
                      </div>
                    </div>
                    <div className="product-card-actions">
                      <button
                        type="button"
                        className="action-button primary-button small-button"
                        onClick={() => onAddProduct(product)}
                        disabled={isSelected}
                      >
                        {isSelected ? 'Already Featured' : 'Add Product'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPicker;
