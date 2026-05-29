import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/apiBase';
import './ImagePicker.css';

const getErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (error.response?.data?.error) return error.response.data.error;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return String(error);
};

const PAGE_SIZE = 32;

const ImagePicker = ({ title, selectedUrl, onSelect, onClose, actionLabel = 'Use Image' }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const resultsRef = useRef(null);

  const loadImages = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/images`, {
        withCredentials: true,
      });

      if (response?.data?.success) {
        setImages(response.data.images || []);
      } else {
        setError('Failed to load images.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, []);

  const categories = useMemo(() => {
    const values = new Set();
    values.add('all');
    images.forEach((image) => {
      if (image.category) values.add(image.category);
      else if (image.folder) values.add(image.folder);
      else values.add('root');
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [images]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (resultsRef.current) {
      resultsRef.current.scrollTop = 0;
    }
  }, [query, category]);

  const filtered = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    return images.filter((image) => {
      if (category !== 'all') {
        const imageCategory = image.category || image.folder || 'root';
        if (imageCategory !== category) return false;
      }
      if (!normalizedQuery) return true;
      return [image.filename, image.folder, image.category, image.url]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [category, images, query]);

  const visibleImages = filtered.slice(0, visibleCount);
  const remainingCount = Math.max(0, filtered.length - visibleImages.length);

  const handleCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.warn('Copy path failed:', err);
    }
  };

  return (
    <div className="image-picker-backdrop" role="dialog" aria-modal="true">
      <div className="image-picker-modal">
        <div className="image-picker-header">
          <div>
            <h2>{title}</h2>
            <p className="picker-help-text">
              Select from images already uploaded to your storefront. You can still paste an image path manually.
            </p>
          </div>
          <button type="button" className="action-button secondary-button close-modal-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="image-picker-controls">
          <div className="image-picker-search">
            <label className="form-label" htmlFor="image-picker-search">Search images</label>
            <input
              id="image-picker-search"
              className="form-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search images by filename or folder…"
            />
          </div>
          <div className="image-picker-filter">
            <label className="form-label" htmlFor="image-picker-category">Category</label>
            <select
              id="image-picker-category"
              className="form-input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item === 'all' ? 'All categories' : item}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="image-picker-count">
          <p>{`Showing ${visibleImages.length} of ${filtered.length} images`}</p>
        </div>

        {loading ? (
          <div className="image-picker-loading">
            <p>Loading image gallery…</p>
          </div>
        ) : error ? (
          <div className="image-picker-error">
            <p>Could not load images.</p>
            <p>{error}</p>
            <button type="button" className="action-button primary-button" onClick={loadImages}>
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="image-picker-empty">
            <p>No images match your search or filter.</p>
          </div>
        ) : (
          <div className="image-picker-results" ref={resultsRef}>
            <div className="image-picker-grid">
              {visibleImages.map((image) => {
                const isSelected = selectedUrl && selectedUrl === image.url;
                return (
                  <div key={image.url} className={`image-card${isSelected ? ' selected' : ''}`}>
                    <div className="image-card-thumb">
                      <img
                        src={image.url}
                        alt={image.label || image.filename}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                          event.currentTarget.parentElement?.classList.add('image-thumb-error');
                        }}
                      />
                    </div>
                    <div className="image-card-body">
                      <div className="image-card-title">{image.filename}</div>
                      <div className="image-card-meta">{image.folder || 'root'}</div>
                      <div className="image-card-meta">{image.category || 'uncategorized'}</div>
                    </div>
                    <div className="image-card-actions">
                      <button type="button" className="action-button primary-button small-button" onClick={() => onSelect(image.url)}>
                        {actionLabel}
                      </button>
                      <button type="button" className="action-button secondary-button small-button" onClick={() => handleCopy(image.url)}>
                        Copy Path
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {visibleCount < filtered.length && (
              <div className="image-picker-load-more">
                <button
                  type="button"
                  className="action-button secondary-button"
                  onClick={() => setVisibleCount(Math.min(filtered.length, visibleCount + PAGE_SIZE))}
                >
                  {`Load More Images (${Math.min(PAGE_SIZE, remainingCount)} more)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePicker;
