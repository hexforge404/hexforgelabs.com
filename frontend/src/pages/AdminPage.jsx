import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPage.css';
import API_BASE_URL from '../utils/apiBase';
import { successToast, errorToast, warningToast } from '../utils/toastUtils';
import InventoryViewer from '../components/InventoryViewer';

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: '',
  image: '',
  brand: 'HexForge',
  stock: 0,
  categories: '',
  isFeatured: false,
};

const EMPTY_BLOG = {
  title: '',
  content: '',
  image: '',
  youtube: '',
  affiliate: '',
  tags: '',
  publishDate: '',
  isDraft: false,
  metaDescription: '',
  visibility: 'public',
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('products');

  // Products / Orders / Blog
  const [products, setProducts] = useState([]);
  const [existingNames, setExistingNames] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [blogForm, setBlogForm] = useState(EMPTY_BLOG);
  const [editingPostId, setEditingPostId] = useState(null);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // preview-only images for drag & drop
  const [productPreviewImage, setProductPreviewImage] = useState(null);
  const [blogPreviewImage, setBlogPreviewImage] = useState(null);

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes, postsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/products`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/orders`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/blog`, { withCredentials: true }),
        ]);

        const productData = productsRes.data || [];
        const orderData = ordersRes.data?.data || ordersRes.data || [];
        const blogData = postsRes.data || [];

        setProducts(productData);
        setExistingNames(
          productData.map((p) =>
            (p.name || '').replace(/\s+/g, '').toLowerCase()
          )
        );
        setOrders(orderData);
        setPosts(blogData);
      } catch (err) {
        console.error(err);
        setError(`Failed to load admin data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ---------- HELPERS ----------
  const normalizeName = (name) => name.replace(/\s+/g, '').toLowerCase();

  const resetProductForm = () => {
    setForm(EMPTY_PRODUCT);
    setEditingProductId(null);
    setProductPreviewImage(null);
  };

  const resetBlogForm = () => {
    setBlogForm(EMPTY_BLOG);
    setEditingPostId(null);
    setBlogPreviewImage(null);
  };

  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buildProductPayload = () => {
    return {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price) || 0,
      image: form.image.trim(),
      brand: (form.brand || 'HexForge').trim() || 'HexForge',
      stock: Number(form.stock) || 0,
      categories: form.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      isFeatured: !!form.isFeatured,
      status: 'active',
    };
  };

  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ---------- IMAGE DROP HANDLER (UPLOAD + PREVIEW) ----------
  const handleImageDrop = async (e, formType) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer?.files && e.dataTransfer.files[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result;
      if (formType === 'product') {
        setProductPreviewImage(url);
      } else if (formType === 'blog') {
        setBlogPreviewImage(url);
      }
    };
    reader.readAsDataURL(file);

    // Upload to backend
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/uploads/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const uploadedUrl = response.data?.url;
      if (!uploadedUrl) {
        throw new Error('No URL returned from upload');
      }

      if (formType === 'product') {
        setForm((prev) => ({
          ...prev,
          image: uploadedUrl, // e.g. /images/filename.ext
        }));
      } else if (formType === 'blog') {
        setBlogForm((prev) => ({
          ...prev,
          image: uploadedUrl,
        }));
      }

      successToast(`Image uploaded and set to ${uploadedUrl}`);
    } catch (err) {
      console.error('Image upload error:', err.response || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Image upload failed';
      errorToast(msg);
    }
  };

  // ---------- PRODUCT CRUD ----------
  const handleSubmitProduct = async (e) => {
    if (e) e.preventDefault();

    setError(null);

    // Basic client-side validation before we even try the API
    const trimmedName = form.name.trim();
    const trimmedDesc = form.description.trim();
    const trimmedImage = form.image.trim();
    const priceNumber = Number(form.price);

    if (!trimmedName) {
      return warningToast('Product name is required');
    }

    if (!trimmedDesc) {
      return warningToast('Product description is required');
    }

    if (!trimmedImage) {
      return warningToast('Image URL is required (e.g. /images/usb-attack.jpg)');
    }

    if (trimmedImage.startsWith('data:')) {
      return warningToast(
        'Image must be a URL like /images/file.jpg, not a data: URL. Use drag-and-drop so the URL is set automatically.'
      );
    }

    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      return warningToast('Price must be a number greater than 0');
    }

    const normalized = normalizeName(trimmedName);

    // Only enforce duplicate check on create
    if (!editingProductId && existingNames.includes(normalized)) {
      return warningToast('A product with this name already exists');
    }

    const payload = buildProductPayload();

    try {
      let response;
      if (editingProductId) {
        // UPDATE
        response = await axios.put(
          `${API_BASE_URL}/admin/products/${editingProductId}`,
          payload,
          { withCredentials: true }
        );
        const updated = response.data?.data || response.data;

        const newProducts = products.map((p) =>
          p._id === editingProductId ? updated : p
        );
        setProducts(newProducts);
        setExistingNames(newProducts.map((p) => normalizeName(p.name || '')));
        successToast('Product updated');
      } else {
        // CREATE
        response = await axios.post(`${API_BASE_URL}/admin/products`, payload, { withCredentials: true });
        const created = response.data?.data || response.data;

        const newProducts = [...products, created];
        setProducts(newProducts);
        setExistingNames(newProducts.map((p) => normalizeName(p.name || '')));
        successToast('Product created');
      }

      resetProductForm();
    } catch (err) {
      console.error(err);
      errorToast(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message
      );
    }
  };

  const handleEditProduct = (product) => {
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      image: product.image || '',
      brand: product.brand || 'HexForge',
      stock: product.stock ?? 0,
      categories: Array.isArray(product.categories)
        ? product.categories.join(', ')
        : product.categories || '',
      isFeatured: !!product.isFeatured,
    });
    setEditingProductId(product._id);
    setProductPreviewImage(product.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/admin/products/${productId}`, { withCredentials: true });
      const newProducts = products.filter((p) => p._id !== productId);
      setProducts(newProducts);
      setExistingNames(newProducts.map((p) => normalizeName(p.name || '')));
      successToast('Product deleted');
      if (editingProductId === productId) {
        resetProductForm();
      }
    } catch (err) {
      console.error(err);
      errorToast(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message
      );
    }
  };

  // ---------- ORDERS ----------
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/orders/${orderId}/status`,
        { status: newStatus }
      );

      const updated = response.data?.data || response.data;

      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? updated : o))
      );

      successToast(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error('Order status update error:', err.response || err);

      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Server error';

      errorToast(msg);
    }
  };

  // ---------- BLOG ----------
  const handleEditPost = (post) => {
    setBlogForm({
      title: post.title,
      content: post.content,
      image: post.image || '',
      youtube: post.video || '',
      affiliate: post.affiliateLink || '',
      tags: post.tags?.join(', ') || '',
      publishDate: post.publishDate?.split('T')[0] || '',
      isDraft: post.isDraft || false,
      metaDescription: post.meta?.description || '',
      visibility: post.visibility || 'public',
    });
    setEditingPostId(post._id);
    setBlogPreviewImage(post.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this blog post?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/blog/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      successToast('Blog post deleted');
      if (editingPostId === postId) {
        resetBlogForm();
      }
    } catch (err) {
      console.error(err);
      errorToast(err.response?.data?.message || err.message);
    }
  };

  const handleSubmitBlog = async () => {
    try {
      if (blogForm.image.trim().startsWith('data:')) {
        return warningToast(
          'Blog image must be a URL (e.g. /images/blog/foo.jpg), not a data: URL. Use drag-and-drop so the URL is set automatically.'
        );
      }

      const payload = {
        title: blogForm.title,
        content: blogForm.content,
        image: blogForm.image,
        video: blogForm.youtube,
        affiliateLink: blogForm.affiliate,
        tags: blogForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        meta: { description: blogForm.metaDescription },
        visibility: blogForm.visibility,
        isDraft: blogForm.isDraft,
        publishDate: blogForm.publishDate,
      };

      let response;
      if (editingPostId) {
        response = await axios.put(
          `${API_BASE_URL}/blog/${editingPostId}`,
          payload
        );
        const updated = response.data?.data || response.data;
        setPosts((prev) =>
          prev.map((p) => (p._id === editingPostId ? updated : p))
        );
        successToast('Blog post updated!');
      } else {
        response = await axios.post(`${API_BASE_URL}/blog`, payload);
        const created = response.data?.data || response.data;
        setPosts((prev) => [...prev, created]);
        successToast('Blog post created!');
      }

      resetBlogForm();
    } catch (err) {
      console.error(err);
      errorToast(err.response?.data?.error || err.message);
    }
  };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="admin-container">
        <p>Loading admin data…</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="tab-bar">
        <button
          className={activeTab === 'products' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button
          className={activeTab === 'orders' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          className={activeTab === 'blog' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('blog')}
        >
          Blog Posts
        </button>
        <button
          className={activeTab === 'inventory' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
      </div>

      {error && (
        <div className="status-message error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-button">
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="status-message success-message">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="close-button">
            ×
          </button>
        </div>
      )}

      {/* ---------- PRODUCTS TAB ---------- */}
      {activeTab === 'products' && (
        <div>
          <h2 className="section-header">PRODUCTS</h2>

          <form onSubmit={handleSubmitProduct}>
            <div
              className="form-grid"
              onDrop={(e) => handleImageDrop(e, 'product')}
              onDragOver={preventDefaults}
            >
              <input
                className="form-input"
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleProductChange}
              />
              <input
                className="form-input"
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleProductChange}
              />
              <input
                className="form-input"
                name="price"
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={handleProductChange}
              />
              <input
                className="form-input"
                name="stock"
                type="number"
                placeholder="Stock"
                value={form.stock}
                onChange={handleProductChange}
              />
              <input
                className="form-input"
                name="categories"
                placeholder="Categories (comma separated)"
                value={form.categories}
                onChange={handleProductChange}
              />
              <div className="form-image-wrapper">
                <input
                  className="form-input"
                  name="image"
                  placeholder="Image URL (e.g. /images/my-product.jpg)"
                  value={form.image}
                  onChange={handleProductChange}
                />
                <small className="hint-text">
                  Drag an image here to upload and preview it. The Image URL
                  will be filled automatically with /images/filename.ext.
                </small>
                {productPreviewImage && (
                  <div className="image-preview">
                    <img src={productPreviewImage} alt="Preview" />
                  </div>
                )}
              </div>
              <label style={{ color: '#ccc' }}>
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={form.isFeatured}
                  onChange={handleProductChange}
                />{' '}
                Featured
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '2rem',
              }}
            >
              <button type="submit" className="primary-button">
                {editingProductId ? 'Update Product' : 'Create Product'}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetProductForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="product-grid">
            {products.map((product) => (
              <div key={product._id} className="product-card">
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                  />
                )}
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <p>
                  <strong>${product.price}</strong>
                </p>
                <p>Stock: {product.stock}</p>
                <p>Featured: {product.isFeatured ? 'Yes' : 'No'}</p>
                <p>
                  Category:{' '}
                  {Array.isArray(product.categories)
                    ? product.categories.join(', ')
                    : product.categories}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                  }}
                >
                  <button
                    type="button"
                    className="secondary-button small-button"
                    onClick={() => handleEditProduct(product)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button small-button"
                    onClick={() => handleDeleteProduct(product._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- ORDERS TAB ---------- */}
      {activeTab === 'orders' && (
        <div>
          <h2 className="section-header">ORDERS</h2>

          {!orders || orders.length === 0 ? (
            <div className="empty-state">No orders found yet.</div>
          ) : (
            <div className="admin-orders-grid">
              {orders.map((order) => {
                const shortId = order.orderId
                  ? order.orderId.slice(-5).toUpperCase()
                  : order._id?.slice(-5).toUpperCase() || '—';
                const total =
                  order.total ??
                  order.subtotal ??
                  (Array.isArray(order.items)
                    ? order.items.reduce(
                        (sum, item) =>
                          sum +
                          (Number(item.price) || 0) * (item.quantity || 1),
                        0
                      )
                    : 0);

                return (
                  <div key={order._id} className="admin-order-card">
                    <div className="admin-order-header">
                      <div>
                        <div className="admin-order-title">
                          Order #{shortId}
                        </div>
                        <div className="admin-order-meta">
                          <span>
                            <span className="label">Total:</span> $
                            {total.toFixed(2)}
                          </span>
                          <span>
                            <span className="label">Customer:</span>{' '}
                            {order.customer?.name || 'Guest'}
                          </span>
                          {order.customer?.email && (
                            <span className="admin-order-email">
                              {order.customer.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="admin-order-status-wrap">
                        <select
                          value={order.status || 'pending'}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value)
                          }
                          className="admin-order-status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="admin-order-items">
                      {order.items?.map((item, idx) => {
                        const qty = item.quantity || 1;
                        const price = Number(item.price) || 0;
                        const lineTotal = price * qty;
                        const imgSrc = item.image || null;

                        return (
                          <div className="admin-order-item-row" key={idx}>
                            {imgSrc && (
                              <div className="admin-order-item-thumb">
                                <img src={imgSrc} alt={item.name} />
                              </div>
                            )}
                            <div className="admin-order-item-main">
                              <div className="admin-order-item-name">
                                {item.name}
                              </div>
                              <div className="admin-order-item-meta">
                                <span>${price.toFixed(2)}</span>
                                <span>× {qty}</span>
                                <span className="admin-order-item-subtotal">
                                  ${lineTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="admin-order-footer">
                      <span className="admin-order-created-at">
                        Placed:{' '}
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString()
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- BLOG TAB ---------- */}
      {activeTab === 'blog' && (
        <div>
          <h2 className="section-header">BLOG POSTS</h2>
          <div
            className="form-grid"
            onDrop={(e) => handleImageDrop(e, 'blog')}
            onDragOver={preventDefaults}
          >
            <input
              className="form-input"
              name="title"
              placeholder="Blog title"
              value={blogForm.title}
              onChange={(e) =>
                setBlogForm({ ...blogForm, title: e.target.value })
              }
            />
            <textarea
              className="form-input"
              name="content"
              placeholder="Blog content"
              value={blogForm.content}
              onChange={(e) =>
                setBlogForm({ ...blogForm, content: e.target.value })
              }
              rows={4}
            />
            <input
              className="form-input"
              name="metaDescription"
              placeholder="Meta description"
              value={blogForm.metaDescription}
              onChange={(e) =>
                setBlogForm({
                  ...blogForm,
                  metaDescription: e.target.value,
                })
              }
            />
            <div className="form-image-wrapper">
              <input
                className="form-input"
                name="image"
                placeholder="Image URL (e.g. /images/blog/my-post.jpg)"
                value={blogForm.image}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, image: e.target.value })
                }
              />
              <small className="hint-text">
                Drag an image here to upload and preview it. The Image URL will
                be filled automatically.
              </small>
              {blogPreviewImage && (
                <div className="image-preview">
                  <img src={blogPreviewImage} alt="Preview" />
                </div>
              )}
            </div>
            <input
              className="form-input"
              name="youtube"
              placeholder="YouTube video link"
              value={blogForm.youtube}
              onChange={(e) =>
                setBlogForm({ ...blogForm, youtube: e.target.value })
              }
            />
            <input
              className="form-input"
              name="affiliate"
              placeholder="Affiliate link (optional)"
              value={blogForm.affiliate}
              onChange={(e) =>
                setBlogForm({ ...blogForm, affiliate: e.target.value })
              }
            />
            <input
              className="form-input"
              name="tags"
              placeholder="Comma-separated tags"
              value={blogForm.tags}
              onChange={(e) =>
                setBlogForm({ ...blogForm, tags: e.target.value })
              }
            />
            <input
              className="form-input"
              name="publishDate"
              type="date"
              value={blogForm.publishDate}
              onChange={(e) =>
                setBlogForm({ ...blogForm, publishDate: e.target.value })
              }
            />
            <label style={{ color: '#ccc' }}>
              <input
                type="checkbox"
                name="isDraft"
                checked={blogForm.isDraft}
                onChange={(e) =>
                  setBlogForm({
                    ...blogForm,
                    isDraft: e.target.checked,
                  })
                }
              />{' '}
              Draft
            </label>
            <label style={{ color: '#ccc' }}>
              Visibility:
              <select
                name="visibility"
                value={blogForm.visibility}
                onChange={(e) =>
                  setBlogForm({
                    ...blogForm,
                    visibility: e.target.value,
                  })
                }
                className="form-input"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </label>
            <button
              className="primary-button"
              onClick={handleSubmitBlog}
              style={{ marginTop: '1rem' }}
            >
              {editingPostId ? 'Update Blog Post' : 'Publish Blog Post'}
            </button>
          </div>

          <div className="product-grid">
            {posts.map((post) => (
              <div key={post._id} className="product-card">
                {post.image && (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="product-image"
                  />
                )}
                <h3>{post.title}</h3>
                <p>{post.content.slice(0, 100)}...</p>
                <p>{post.tags?.join(', ')}</p>
                <p>
                  {post.createdAt
                    ? new Date(post.createdAt).toLocaleDateString()
                    : ''}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="secondary-button small-button"
                    onClick={() => handleEditPost(post)}
                  >
                    Edit
                  </button>
                  <button
                    className="danger-button small-button"
                    onClick={() => handleDeletePost(post._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- INVENTORY TAB (NOTION) ---------- */}
      {activeTab === 'inventory' && <InventoryViewer />}
    </div>
  );
}
