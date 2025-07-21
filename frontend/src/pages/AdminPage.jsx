import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPage.css';
import API_BASE_URL from '../utils/apiBase';
import { useCart } from 'context/CartContext';
import { successToast, errorToast, warningToast } from '../utils/toastUtils';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [existingNames, setExistingNames] = useState([]);
  const [orders, setOrders] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    brand: 'HexForge',
    stock: 0,
    categories: '',
    isFeatured: false
  });
  const [blogForm, setBlogForm] = useState({
    title: '',
    content: '',
    image: '',
    youtube: '',
    affiliate: '',
    tags: '',
    publishDate: '',
    isDraft: false,
    metaDescription: '',
    visibility: 'public'
  });
  const [editingPostId, setEditingPostId] = useState(null);
  const [dragImageUrl, setDragImageUrl] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes, postsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/products?raw=true`),
          axios.get(`${API_BASE_URL}/orders`),
          axios.get(`${API_BASE_URL}/blog`)
        ]);

        setProducts(productsRes.data);
        setExistingNames(productsRes.data.map(p => p.name.replace(/\s+/g, '').toLowerCase()));
        setOrders(ordersRes.data.data || ordersRes.data);
        setPosts(postsRes.data);
      } catch (err) {
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleImageDrop = (e, formType) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result;
      if (formType === 'product') {
        setForm(prev => ({ ...prev, image: url }));
      } else if (formType === 'blog') {
        setBlogForm(prev => ({ ...prev, image: url }));
      }
      setDragImageUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/orders/${orderId}`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? response.data : o));
      successToast(`Status updated to ${newStatus}`);
    } catch (err) {
      errorToast(err.response?.data?.message || err.message);
    }
  };

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
      visibility: post.visibility || 'public'
    });
    setEditingPostId(post._id);
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API_BASE_URL}/blog/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      successToast('Blog post deleted');
    } catch (err) {
      errorToast(err.response?.data?.message || err.message);
    }
  };

  const handleSubmitBlog = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/blog`, {
      title: blogForm.title,
      content: blogForm.content,
      image: blogForm.image,
      video: blogForm.youtube,
      affiliateLink: blogForm.affiliate,
      tags: blogForm.tags.split(',').map(tag => tag.trim()),
      meta: { description: blogForm.metaDescription },
      visibility: blogForm.visibility,
      isDraft: blogForm.isDraft,
      publishDate: blogForm.publishDate,
    });

    successToast('Blog post created!');
    setPosts(prev => [...prev, response.data]);
    setBlogForm({
      title: '',
      content: '',
      image: '',
      youtube: '',
      affiliate: '',
      tags: '',
      publishDate: '',
      isDraft: false,
      metaDescription: '',
      visibility: 'public'
    });
  } catch (err) {
    console.error(err);
    errorToast(err.response?.data?.error || err.message);
  }
};


  return (
    <div className="admin-container">
      <div className="tab-bar">
        <button className={activeTab === 'products' ? 'tab active' : 'tab'} onClick={() => setActiveTab('products')}>Products</button>
        <button className={activeTab === 'orders' ? 'tab active' : 'tab'} onClick={() => setActiveTab('orders')}>Orders</button>
        <button className={activeTab === 'blog' ? 'tab active' : 'tab'} onClick={() => setActiveTab('blog')}>Blog Posts</button>
      </div>

      {error && <div className="status-message error-message"><span>{error}</span><button onClick={() => setError(null)} className="close-button">×</button></div>}
      {success && <div className="status-message success-message"><span>{success}</span><button onClick={() => setSuccess(null)} className="close-button">×</button></div>}

      {activeTab === 'products' && (
        <div>
          <h2 className="section-header">PRODUCTS</h2>
          <div className="form-grid" onDrop={e => handleImageDrop(e, 'product')} onDragOver={preventDefaults}>
            <input className="form-input" name="name" placeholder="Name" value={form.name} onChange={handleProductChange} />
            <input className="form-input" name="description" placeholder="Description" value={form.description} onChange={handleProductChange} />
            <input className="form-input" name="price" type="number" placeholder="Price" value={form.price} onChange={handleProductChange} />
            <input className="form-input" name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleProductChange} />
            <input className="form-input" name="categories" placeholder="Categories" value={form.categories} onChange={handleProductChange} />
            <input className="form-input" name="image" placeholder="Image URL (or drop)" value={form.image} onChange={handleProductChange} />
            <label style={{ color: '#ccc' }}>
              <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleProductChange} /> Featured
            </label>
          </div>
          <div className="product-grid">
            {products.map(product => (
              <div key={product._id} className="product-card">
                {product.image && <img src={product.image} alt={product.name} className="product-image" />}
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <p><strong>${product.price}</strong></p>
                <p>Stock: {product.stock}</p>
                <p>Featured: {product.isFeatured ? 'Yes' : 'No'}</p>
                <p>Category: {product.categories?.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <h2 className="section-header">ORDERS</h2>
          <div className="product-grid">
            {orders.map(order => (
              <div key={order._id} className="product-card">
                <h3>Order #{order._id.slice(-5).toUpperCase()}</h3>
                <p>Status:
                  <select value={order.status} onChange={e => handleStatusChange(order._id, e.target.value)} className="form-input">
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </p>
                <p>Total: ${order.subtotal}</p>
                <p>Customer: {order.customer?.name || 'N/A'}</p>
                <ul>
                  {order.items.map((item, idx) => (
                    <li key={idx}>
                      {item.image && <img src={item.image} alt={item.name} className="item-thumbnail" />} {item.name} – ${item.price} x {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'blog' && (
        <div>
          <h2 className="section-header">BLOG POSTS</h2>
          <div className="form-grid" onDrop={e => handleImageDrop(e, 'blog')} onDragOver={preventDefaults}>
            <input className="form-input" name="title" placeholder="Blog title" value={blogForm.title} onChange={e => setBlogForm({ ...blogForm, title: e.target.value })} />
            <textarea className="form-input" name="content" placeholder="Blog content" value={blogForm.content} onChange={e => setBlogForm({ ...blogForm, content: e.target.value })} rows={4} />
            <input className="form-input" name="metaDescription" placeholder="Meta description" value={blogForm.metaDescription} onChange={e => setBlogForm({ ...blogForm, metaDescription: e.target.value })} />
            <input className="form-input" name="image" placeholder="Image URL (or drop)" value={blogForm.image} onChange={e => setBlogForm({ ...blogForm, image: e.target.value })} />
            <input className="form-input" name="youtube" placeholder="YouTube video link" value={blogForm.youtube} onChange={e => setBlogForm({ ...blogForm, youtube: e.target.value })} />
            <input className="form-input" name="affiliate" placeholder="Affiliate link (optional)" value={blogForm.affiliate} onChange={e => setBlogForm({ ...blogForm, affiliate: e.target.value })} />
            <input className="form-input" name="tags" placeholder="Comma-separated tags" value={blogForm.tags} onChange={e => setBlogForm({ ...blogForm, tags: e.target.value })} />
            <input className="form-input" name="publishDate" type="date" value={blogForm.publishDate} onChange={e => setBlogForm({ ...blogForm, publishDate: e.target.value })} />
            <label style={{ color: '#ccc' }}>
              <input type="checkbox" name="isDraft" checked={blogForm.isDraft} onChange={e => setBlogForm({ ...blogForm, isDraft: e.target.checked })} /> Draft
            </label>
            <label style={{ color: '#ccc' }}>
              Visibility:
              <select name="visibility" value={blogForm.visibility} onChange={e => setBlogForm({ ...blogForm, visibility: e.target.value })} className="form-input">
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
              Publish Blog Post
            </button>
          </div>
          <div className="product-grid">
            {posts.map(post => (
              <div key={post._id} className="product-card">
                {post.image && <img src={post.image} alt={post.title} className="product-image" />}
                <h3>{post.title}</h3>
                <p>{post.content.slice(0, 100)}...</p>
                <p>{post.tags?.join(', ')}</p>
                <p>{new Date(post.createdAt).toLocaleDateString()}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary-button small-button" onClick={() => handleEditPost(post)}>Edit</button>
                  <button className="danger-button small-button" onClick={() => handleDeletePost(post._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
