import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const DEFAULT_PRODUCT_SLUG = 'multi-panel-lithophane-lamp';

function FreePhotoCheckPage() {
  const [searchParams] = useSearchParams();
  const productSlug = searchParams.get('product') || DEFAULT_PRODUCT_SLUG;
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/slug/${encodeURIComponent(productSlug)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setProduct(data);
      } catch (err) {
        console.warn('Unable to load photo check product context:', err);
      }
    }
    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files || []).slice(0, 5));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.customerName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!form.customerEmail.trim() && !form.customerPhone.trim()) {
      toast.error('Please provide an email or phone number.');
      return;
    }
    if (!files.length) {
      toast.error('Please upload at least one photo.');
      return;
    }

    const payload = new FormData();
    payload.append('productSlug', productSlug);
    if (product?._id) payload.append('productId', product._id);
    payload.append('customerName', form.customerName);
    payload.append('customerEmail', form.customerEmail);
    payload.append('customerPhone', form.customerPhone);
    payload.append('notes', form.notes);
    files.forEach((file) => payload.append('images[]', file));

    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch('/api/products/photo-check', {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Photo check submission failed.');
      }
      setResult(data);
      setForm({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        notes: '',
      });
      setFiles([]);
      event.target.reset();
      toast.success('Photo check submitted.');
    } catch (err) {
      toast.error(err.message || 'Photo check submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="photo-check-page">
      <section className="photo-check-hero">
        <div>
          <p className="photo-check-eyebrow">HexForge Labs | Free Photo Check</p>
          <h1>Request a free photo check before you order</h1>
          <p>
            Upload one or more photos and HexForge Labs will review whether they are likely to work well
            as a custom lithophane keepsake. This is a pre-order review, not a checkout.
          </p>
          {product && (
            <p className="photo-check-product-context">
              Product context: <strong>{product.title || product.name}</strong>
            </p>
          )}
        </div>
        <div className="photo-check-note-card">
          <h2>What happens next?</h2>
          <p>
            Your photos are saved privately for review. They are not used publicly without permission.
            A HexForge Labs response will explain what should work before you move forward.
          </p>
        </div>
      </section>

      <form className="photo-check-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            value={form.customerName}
            onChange={(event) => updateField('customerName', event.target.value)}
            required
          />
        </label>
        <div className="photo-check-two-column">
          <label>
            Email
            <input
              type="email"
              value={form.customerEmail}
              onChange={(event) => updateField('customerEmail', event.target.value)}
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(event) => updateField('customerPhone', event.target.value)}
            />
          </label>
        </div>
        <label>
          Photos for review
          <input type="file" accept="image/*" multiple onChange={handleFileChange} required />
        </label>
        {files.length > 0 && (
          <p className="photo-check-file-count">{files.length} photo{files.length === 1 ? '' : 's'} selected</p>
        )}
        <label>
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="Tell us what product or memory you have in mind."
            rows="4"
          />
        </label>
        <button type="submit" className="photo-check-submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Free Photo Check'}
        </button>
      </form>

      {result && (
        <section className="photo-check-success">
          <h2>Photo check received</h2>
          <p>Reference ID: {result.orderId}</p>
          <p>Photos uploaded: {result.imagesCount}</p>
          <Link to={`/store/${productSlug}`}>Return to product page</Link>
        </section>
      )}
    </main>
  );
}

export default FreePhotoCheckPage;
