import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPage.css';
import API_BASE_URL from '../utils/apiBase';
import { successToast, errorToast, warningToast } from '../utils/toastUtils';
import InventoryViewer from '../components/InventoryViewer';
import { useAdmin } from '../context/AdminContext';

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: '',
  image: '',
  imageGallery: '',
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

const EMPTY_PROMO = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  isActive: true,
  usageLimit: '',
  minimumOrderAmount: '',
  allowedCategories: '',
  allowedProducts: '',
  expiresAt: '',
};

const formatLightTypeForDisplay = (lightType, { internal = false } = {}) => {
  if (lightType === 'rgb') {
    return internal ? 'Legacy RGB option' : 'LED';
  }
  if (!lightType) return '—';
  return lightType;
};

export default function AdminPage() {
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState('products');

  // Products / Orders / Blog
  const [products, setProducts] = useState([]);
  const [existingNames, setExistingNames] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [customOrderStatusFilter, setCustomOrderStatusFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [blogForm, setBlogForm] = useState(EMPTY_BLOG);
  const [editingPostId, setEditingPostId] = useState(null);
  const [promoForm, setPromoForm] = useState(EMPTY_PROMO);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [promoAuditLogs, setPromoAuditLogs] = useState([]);
  const [promoAuditFilters, setPromoAuditFilters] = useState({
    promoCode: '',
    action: '',
    actor: '',
  });
  const [promoAuditPage, setPromoAuditPage] = useState(0);
  const [promoAuditTotal, setPromoAuditTotal] = useState(0);
  const [isLoadingPromoAudit, setIsLoadingPromoAudit] = useState(false);
  const [promoAuditQueryToken, setPromoAuditQueryToken] = useState(0);

  // Gallery Manager
  const [galleryProductId, setGalleryProductId] = useState('');
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryHeroId, setGalleryHeroId] = useState('');
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryError, setGalleryError] = useState(null);
  const [galleryReplacingId, setGalleryReplacingId] = useState('');

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [adminRoles, setAdminRoles] = useState([]);

  // preview-only images for drag & drop
  const [productPreviewImage, setProductPreviewImage] = useState(null);
  const [blogPreviewImage, setBlogPreviewImage] = useState(null);

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes, customOrdersRes, postsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/products`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/orders`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/admin/custom-orders${customOrderStatusFilter !== 'all' ? `?status=${encodeURIComponent(customOrderStatusFilter)}` : ''}`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/blog`, { withCredentials: true }),
        ]);

        const productData = productsRes.data || [];
        const orderData = ordersRes.data?.data || ordersRes.data || [];
        const customOrderData = customOrdersRes.data?.data || [];
        const blogData = postsRes.data || [];

        setProducts(productData);
        setExistingNames(
          productData.map((p) =>
            (p.name || '').replace(/\s+/g, '').toLowerCase()
          )
        );
        setOrders(orderData);
        setCustomOrders(customOrderData);
        setPosts(blogData);
      } catch (err) {
        console.error(err);
        setError(`Failed to load admin data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customOrderStatusFilter]);

  useEffect(() => {
    const loadAdminRoles = async () => {
      try {
        if (admin?.roles?.length) {
          setAdminRoles(admin.roles);
          return;
        }
        const sessionRes = await axios.get(`${API_BASE_URL}/admin/session`, { withCredentials: true });
        const roles = sessionRes.data?.admin?.roles || [];
        setAdminRoles(roles);
      } catch (err) {
        console.warn('Failed to load admin roles:', err.message || err);
        setAdminRoles([]);
      }
    };
    loadAdminRoles();
  }, [admin]);

  const canManagePromos = adminRoles.includes('promotions') || adminRoles.includes('admin') || adminRoles.includes('superadmin');

  useEffect(() => {
    if (!canManagePromos) {
      setPromoCodes([]);
      return;
    }

    const loadPromoCodes = async () => {
      try {
        const promoRes = await axios.get(`${API_BASE_URL}/admin/promo-codes`, { withCredentials: true });
        setPromoCodes(promoRes.data || []);
      } catch (err) {
        console.error('Failed to fetch promo codes:', err);
        errorToast(err.response?.data?.error || err.message || 'Failed to load promo codes');
      }
    };

    loadPromoCodes();
  }, [canManagePromos]);

  useEffect(() => {
    if (activeTab !== 'promo-audit' || !canManagePromos) return;

    const loadPromoAudit = async () => {
      try {
        setIsLoadingPromoAudit(true);
        const limit = 25;
        const offset = promoAuditPage * limit;
        const params = {
          promoCode: promoAuditFilters.promoCode || undefined,
          action: promoAuditFilters.action || undefined,
          actor: promoAuditFilters.actor || undefined,
          limit,
          offset,
        };
        const response = await axios.get(`${API_BASE_URL}/admin/promo-audit`, {
          params,
          withCredentials: true,
        });
        const payload = response.data || {};
        setPromoAuditLogs(payload.data || []);
        setPromoAuditTotal(payload.pagination?.total || 0);
      } catch (err) {
        console.error('Failed to fetch promo audit logs:', err);
        errorToast(err.response?.data?.error || err.message || 'Failed to load promo audit logs');
      } finally {
        setIsLoadingPromoAudit(false);
      }
    };

    loadPromoAudit();
  }, [activeTab, canManagePromos, promoAuditPage, promoAuditQueryToken]);

  useEffect(() => {
    if (activeTab !== 'custom-orders') return;
    const loadFilteredCustomOrders = async () => {
      const customOrderData = await fetchCustomOrders(customOrderStatusFilter);
      setCustomOrders(customOrderData);
    };
    loadFilteredCustomOrders();
  }, [activeTab, customOrderStatusFilter]);

  // ---------- HELPERS ----------
  const normalizeName = (name) => name.replace(/\s+/g, '').toLowerCase();

  const normalizeGalleryName = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const makeSafeDomId = (value) =>
    String(value || '')
      .trim()
      .replace(/[^a-z0-9-_]+/gi, '_');

  const formatPromoAuditMeta = (entry) => {
    const parts = [];
    if (entry?.metadata?.importCount) parts.push(`importCount=${entry.metadata.importCount}`);
    if (entry?.metadata?.exportFormat) parts.push(`export=${entry.metadata.exportFormat}`);
    if (entry?.metadata?.sourceIp) parts.push(`ip=${entry.metadata.sourceIp}`);
    return parts.length ? parts.join(' • ') : '-';
  };

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

  const resetPromoForm = () => {
    setPromoForm(EMPTY_PROMO);
    setEditingPromoId(null);
  };

  const CUSTOM_ORDER_STATUS_LABELS = {
    submitted: 'Submitted',
    awaiting_deposit: 'Awaiting Deposit',
    deposit_paid: 'Deposit Paid',
    reviewing_assets: 'Reviewing Assets',
    in_production: 'In Production',
    ready_to_ship: 'Ready To Ship',
    shipped: 'Shipped',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const fetchCustomOrders = async (status = 'all') => {
    try {
      const statusParam = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
      const response = await axios.get(`${API_BASE_URL}/admin/custom-orders${statusParam}`, {
        withCredentials: true,
      });
      return response.data?.data || [];
    } catch (err) {
      console.error('Failed to fetch custom orders:', err);
      return [];
    }
  };

  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const setGalleryFromProduct = (payload) => {
    const list = Array.isArray(payload.imageGallery)
      ? payload.imageGallery.filter(Boolean)
      : [];
    const items = list.map((url, index) => ({
      id: `existing-${index}-${url}`,
      url,
      type: 'existing',
      name: '',
    }));
    setGalleryItems(items);

    const heroUrl = payload.hero_image_url || (items[0] ? items[0].url : '');
    const heroItem = items.find((item) => item.url === heroUrl) || items[0];
    setGalleryHeroId(heroItem ? heroItem.id : '');
  };

  const loadGalleryForProduct = async (productId) => {
    if (!productId) return;
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/products/${productId}/gallery`, {
        withCredentials: true,
      });
      setGalleryFromProduct(response.data || {});
    } catch (err) {
      console.error('Failed to load gallery:', err);
      setGalleryError(err.response?.data?.error || err.message || 'Failed to load gallery');
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleGalleryProductChange = (e) => {
    const nextId = e.target.value;
    setGalleryProductId(nextId);
    setGalleryItems([]);
    setGalleryHeroId('');
    if (nextId) {
      loadGalleryForProduct(nextId);
    }
  };

  const addGalleryFiles = (files) => {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      return {
        id: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        url: URL.createObjectURL(file),
        file,
        type: 'pending',
        name: normalizeGalleryName(baseName),
      };
    });
    setGalleryItems((prev) => [...prev, ...next]);
  };

  const handleGalleryDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addGalleryFiles(e.dataTransfer?.files);
  };

  const handleGalleryInputChange = (e) => {
    addGalleryFiles(e.target.files);
    e.target.value = '';
  };

  const updateGalleryItem = (id, updates) => {
    setGalleryItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeGalleryItem = (id) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== id));
    setGalleryHeroId((prev) => (prev === id ? '' : prev));
  };

  const setGalleryHero = (id) => {
    setGalleryHeroId(id);
  };

  const moveGalleryItem = (fromIndex, toIndex) => {
    setGalleryItems((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleGalleryDragStart = (index) => (e) => {
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleGalleryDropOn = (index) => (e) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(fromIndex)) {
      moveGalleryItem(fromIndex, index);
    }
  };

  const handleGalleryDragOver = (e) => {
    e.preventDefault();
  };

  const uploadPendingGalleryItems = async (pendingItems) => {
    if (!pendingItems.length) return [];

    const formData = new FormData();
    pendingItems.forEach((item) => {
      formData.append('images', item.file);
      formData.append('names', item.name || '');
    });

    const response = await axios.post(
      `${API_BASE_URL}/admin/products/${galleryProductId}/gallery/upload`,
      formData,
      { withCredentials: true }
    );

    return response.data?.files || [];
  };

  const handleReplaceFile = async (itemId, file) => {
    if (!galleryProductId || !file) return;

    setGalleryReplacingId(itemId);
    setGalleryError(null);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const sanitizedName = normalizeGalleryName(baseName);
      const formData = new FormData();
      formData.append('images', file);
      formData.append('names', sanitizedName || '');

      const response = await axios.post(
        `${API_BASE_URL}/admin/products/${galleryProductId}/gallery/upload`,
        formData,
        { withCredentials: true }
      );

      const uploaded = response.data?.files?.[0];
      if (!uploaded?.url) {
        throw new Error('Upload succeeded but no URL was returned.');
      }

      updateGalleryItem(itemId, { url: uploaded.url, type: 'existing', name: '' });
      successToast('Image replaced. Save gallery to persist changes.');
    } catch (err) {
      console.error('Failed to replace image:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to replace image';
      setGalleryError(msg);
      errorToast(msg);
    } finally {
      setGalleryReplacingId('');
    }
  };

  const handleSaveGallery = async () => {
    if (!galleryProductId) return;
    setGallerySaving(true);
    setGalleryError(null);

    try {
      const pendingItems = galleryItems.filter((item) => item.type === 'pending');
      const uploadResults = await uploadPendingGalleryItems(pendingItems);

      let pendingIndex = 0;
      const mergedItems = galleryItems.map((item) => {
        if (item.type !== 'pending') return item;
        const uploaded = uploadResults[pendingIndex];
        pendingIndex += 1;
        return {
          id: item.id,
          url: uploaded?.url || item.url,
          type: 'existing',
          name: '',
        };
      });

      const heroItem = mergedItems.find((item) => item.id === galleryHeroId) || mergedItems[0];
      const heroUrl = heroItem?.url || '';
      const imageGallery = mergedItems.map((item) => item.url).filter(Boolean);

      const response = await axios.put(
        `${API_BASE_URL}/admin/products/${galleryProductId}/gallery`,
        { hero_image_url: heroUrl, imageGallery },
        { withCredentials: true }
      );

      setGalleryFromProduct(response.data || {});
      successToast('Gallery updated successfully');
    } catch (err) {
      console.error('Failed to save gallery:', err);
      setGalleryError(err.response?.data?.error || err.message || 'Failed to save gallery');
      errorToast(err.response?.data?.error || err.message || 'Failed to save gallery');
    } finally {
      setGallerySaving(false);
    }
  };

  const buildProductPayload = () => {
    const imageGallery = form.imageGallery
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price) || 0,
      image: form.image.trim(),
      imageGallery,
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
          withCredentials: true,
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
      imageGallery: Array.isArray(product.imageGallery)
        ? product.imageGallery.join('\n')
        : product.imageGallery || '',
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

  // ---------- CUSTOM ORDERS ----------
  const handleCustomOrderStatusChange = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/custom-orders/${orderId}`,
        { status: newStatus },
        { withCredentials: true }
      );

      const updated = response.data;
      setCustomOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? updated : o))
      );

      successToast(`Custom order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Custom order status update error:', err.response || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Server error';
      errorToast(msg);
    }
  };

  const handleCustomOrderNotesChange = async (orderId, notes) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/custom-orders/${orderId}`,
        { adminNotes: notes },
        { withCredentials: true }
      );

      const updated = response.data;
      setCustomOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? updated : o))
      );

      successToast('Custom order notes updated');
    } catch (err) {
      console.error('Custom order notes update error:', err.response || err);
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

  // ---------- PROMO CODES ----------
  const handlePromoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPromoForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buildPromoPayload = () => {
    return {
      code: promoForm.code.trim().toUpperCase(),
      description: promoForm.description.trim(),
      discountType: promoForm.discountType,
      discountValue: Number(promoForm.discountValue),
      isActive: !!promoForm.isActive,
      usageLimit: promoForm.usageLimit === '' ? undefined : Number(promoForm.usageLimit),
      minimumOrderAmount: promoForm.minimumOrderAmount === '' ? undefined : Number(promoForm.minimumOrderAmount),
      allowedCategories: promoForm.allowedCategories
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      allowedProducts: promoForm.allowedProducts
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      expiresAt: promoForm.expiresAt || null,
    };
  };

  const handleSubmitPromo = async (e) => {
    if (e) e.preventDefault();

    if (!promoForm.code.trim()) {
      return warningToast('Promo code is required');
    }
    if (!promoForm.discountValue || Number(promoForm.discountValue) < 0) {
      return warningToast('Discount value must be 0 or greater');
    }

    const payload = buildPromoPayload();

    try {
      if (editingPromoId) {
        const response = await axios.patch(
          `${API_BASE_URL}/admin/promo-codes/${editingPromoId}`,
          payload,
          { withCredentials: true }
        );
        const updated = response.data?.data || response.data;
        setPromoCodes((prev) => prev.map((p) => (p._id === editingPromoId ? updated : p)));
        successToast('Promo code updated');
      } else {
        const response = await axios.post(`${API_BASE_URL}/admin/promo-codes`, payload, { withCredentials: true });
        const created = response.data?.data || response.data;
        setPromoCodes((prev) => [created, ...prev]);
        successToast('Promo code created');
      }

      resetPromoForm();
    } catch (err) {
      console.error(err);
      errorToast(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message
      );
    }
  };

  const handleEditPromo = (promo) => {
    setPromoForm({
      code: promo.code || '',
      description: promo.description || '',
      discountType: promo.discountType || 'percentage',
      discountValue: promo.discountValue ?? '',
      isActive: promo.isActive !== false,
      usageLimit: promo.usageLimit ?? '',
      minimumOrderAmount: promo.minimumOrderAmount ?? '',
      allowedCategories: Array.isArray(promo.allowedCategories)
        ? promo.allowedCategories.join(', ')
        : promo.allowedCategories || '',
      allowedProducts: Array.isArray(promo.allowedProducts)
        ? promo.allowedProducts.join(', ')
        : promo.allowedProducts || '',
      expiresAt: promo.expiresAt ? promo.expiresAt.split('T')[0] : '',
    });
    setEditingPromoId(promo._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePromo = async (promoId) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin/promo-codes/${promoId}`, { withCredentials: true });
      setPromoCodes((prev) => prev.filter((p) => p._id !== promoId));
      successToast('Promo code deleted');
      if (editingPromoId === promoId) {
        resetPromoForm();
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

  const handleTogglePromoActive = async (promo) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/promo-codes/${promo._id}`,
        { isActive: !promo.isActive },
        { withCredentials: true }
      );
      const updated = response.data?.data || response.data;
      setPromoCodes((prev) => prev.map((p) => (p._id === promo._id ? updated : p)));
      successToast(`Promo code ${updated.isActive ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error(err);
      errorToast(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message
      );
    }
  };

  const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map((value) => value.trim());
  };

  const parsePromoCsv = (text) => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const item = {};
      headers.forEach((header, index) => {
        item[header] = values[index];
      });
      if (item.isactive !== undefined) item.isActive = item.isactive === 'true';
      if (item.usagecount !== undefined) item.usageCount = Number(item.usagecount) || 0;
      if (item.usagelimit !== undefined) item.usageLimit = item.usagelimit === '' ? undefined : Number(item.usagelimit);
      if (item.minimumorderamount !== undefined) item.minimumOrderAmount = item.minimumorderamount === '' ? undefined : Number(item.minimumorderamount);
      if (item.allowedcategories) item.allowedCategories = item.allowedcategories.split('|').filter(Boolean);
      if (item.allowedproducts) item.allowedProducts = item.allowedproducts.split('|').filter(Boolean);
      if (item.expiresat) item.expiresAt = item.expiresat;
      if (item.discountvalue !== undefined) item.discountValue = Number(item.discountvalue);
      if (item.discounttype !== undefined) item.discountType = item.discounttype;
      if (item.code !== undefined) item.code = item.code;
      if (item.description !== undefined) item.description = item.description;
      return item;
    });
  };

  const handlePromoExport = async (format) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/promo-codes/export?format=${format}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `promo-codes.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      successToast(`Exported promo codes (${format.toUpperCase()})`);
    } catch (err) {
      console.error(err);
      errorToast(err.message || 'Failed to export promo codes');
    }
  };

  const handlePromoImport = async (file) => {
    try {
      const text = await file.text();
      let items = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        items = parsePromoCsv(text);
      } else {
        const parsed = JSON.parse(text);
        items = Array.isArray(parsed) ? parsed : parsed.items || [];
      }

      if (!items.length) {
        return warningToast('No promo codes found in file');
      }

      const response = await axios.post(
        `${API_BASE_URL}/admin/promo-codes/import`,
        { items, mode: 'upsert' },
        { withCredentials: true }
      );

      const result = response.data || {};
      successToast(`Imported ${result.imported || items.length} promo codes`);
      const promoRes = await axios.get(`${API_BASE_URL}/admin/promo-codes`, { withCredentials: true });
      setPromoCodes(promoRes.data || []);
    } catch (err) {
      console.error(err);
      errorToast(err.response?.data?.error || err.message || 'Failed to import promo codes');
    }
  };

  const handlePromoAuditFilterChange = (e) => {
    const { name, value } = e.target;
    setPromoAuditFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyPromoAuditFilters = () => {
    setPromoAuditPage(0);
    setPromoAuditQueryToken((prev) => prev + 1);
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
            className={activeTab === 'gallery' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('gallery')}
          >
            Gallery Manager
          </button>
        <button
          className={activeTab === 'orders' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          className={activeTab === 'custom-orders' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('custom-orders')}
        >
          Custom Lamp Orders
        </button>
        {canManagePromos && (
          <button
            className={activeTab === 'promo-codes' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('promo-codes')}
          >
            Promo Codes
          </button>
        )}
        {canManagePromos && (
          <button
            className={activeTab === 'promo-audit' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('promo-audit')}
          >
            Promo Audit
          </button>
        )}
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
                <textarea
                  className="form-input form-textarea"
                  name="imageGallery"
                  placeholder="Image gallery URLs (one per line or comma separated)"
                  value={form.imageGallery}
                  onChange={handleProductChange}
                  rows={4}
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

      {/* ---------- GALLERY MANAGER TAB ---------- */}
      {activeTab === 'gallery' && (
        <div>
          <h2 className="section-header">GALLERY MANAGER</h2>

          <div className="form-section">
            <div className="gallery-manager-header">
              <label className="form-label" htmlFor="galleryProductSelect">Select Product</label>
              <select
                id="galleryProductSelect"
                className="form-input"
                value={galleryProductId}
                onChange={handleGalleryProductChange}
              >
                <option value="">Select a product...</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name || product.title} {product.sku ? `(${product.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {galleryError && (
              <div className="status-message error-message">
                <span>{galleryError}</span>
              </div>
            )}

            {galleryLoading ? (
              <div className="gallery-loading">Loading gallery...</div>
            ) : (
              <>
                <div className="gallery-preview">
                  <div className="gallery-preview-title">Current Gallery</div>
                  {galleryItems.length === 0 ? (
                    <div className="empty-state">No gallery images yet.</div>
                  ) : (
                    <div className="gallery-grid">
                      {galleryItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={`gallery-card${item.id === galleryHeroId ? ' is-hero' : ''}`}
                          onDragOver={handleGalleryDragOver}
                          onDrop={handleGalleryDropOn(index)}
                        >
                          <div
                            className="gallery-drag-handle"
                            draggable
                            onDragStart={handleGalleryDragStart(index)}
                            title="Drag to reorder"
                          >
                            ⠿
                          </div>
                          <img src={item.url} alt="Gallery item" />
                          {item.id === galleryHeroId && (
                            <span className="gallery-hero-badge">Hero</span>
                          )}
                          <div className="gallery-card-actions">
                            <button
                              type="button"
                              className="secondary-button small-button"
                              onClick={() => setGalleryHero(item.id)}
                            >
                              Set as Hero
                            </button>
                            <button
                              type="button"
                              className="secondary-button small-button"
                              onClick={() => {
                                const inputId = `gallery-replace-${makeSafeDomId(item.id)}`;
                                const input = document.getElementById(inputId);
                                if (input) input.click();
                              }}
                              disabled={galleryReplacingId === item.id}
                            >
                              {galleryReplacingId === item.id ? 'Replacing...' : 'Replace'}
                            </button>
                            <button
                              type="button"
                              className="danger-button small-button"
                              onClick={() => removeGalleryItem(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            id={`gallery-replace-${makeSafeDomId(item.id)}`}
                            className="gallery-replace-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              handleReplaceFile(item.id, file);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="gallery-upload">
                  <div className="gallery-upload-title">Upload Images</div>
                  <div
                    className="gallery-dropzone"
                    onDragOver={handleGalleryDragOver}
                    onDrop={handleGalleryDrop}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryInputChange}
                    />
                    <span>Drag images here or click to upload</span>
                  </div>
                </div>

                {galleryItems.some((item) => item.type === 'pending') && (
                  <div className="gallery-pending">
                    <div className="gallery-preview-title">Pending Uploads</div>
                    <div className="gallery-grid">
                      {galleryItems.filter((item) => item.type === 'pending').map((item) => (
                        <div
                          key={item.id}
                          className="gallery-card"
                          onDragOver={handleGalleryDragOver}
                          onDrop={handleGalleryDropOn(galleryItems.findIndex((entry) => entry.id === item.id))}
                        >
                          <div
                            className="gallery-drag-handle"
                            draggable
                            onDragStart={handleGalleryDragStart(galleryItems.findIndex((entry) => entry.id === item.id))}
                            title="Drag to reorder"
                          >
                            ⠿
                          </div>
                          <img src={item.url} alt="Pending upload" />
                          <input
                            type="text"
                            className="form-input gallery-rename"
                            value={item.name}
                            placeholder="filename-slug"
                            onChange={(e) => updateGalleryItem(item.id, { name: normalizeGalleryName(e.target.value) })}
                          />
                          <div className="gallery-card-actions">
                            <button
                              type="button"
                              className="secondary-button small-button"
                              onClick={() => setGalleryHero(item.id)}
                            >
                              Set as Hero
                            </button>
                            <button
                              type="button"
                              className="secondary-button small-button"
                              onClick={() => {
                                const inputId = `gallery-replace-${makeSafeDomId(item.id)}`;
                                const input = document.getElementById(inputId);
                                if (input) input.click();
                              }}
                              disabled={galleryReplacingId === item.id}
                            >
                              {galleryReplacingId === item.id ? 'Replacing...' : 'Replace'}
                            </button>
                            <button
                              type="button"
                              className="danger-button small-button"
                              onClick={() => removeGalleryItem(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            id={`gallery-replace-${makeSafeDomId(item.id)}`}
                            className="gallery-replace-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              handleReplaceFile(item.id, file);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="gallery-save-row">
                  <button
                    type="button"
                    className="action-button primary-button"
                    disabled={!galleryProductId || gallerySaving}
                    onClick={handleSaveGallery}
                  >
                    {gallerySaving ? 'Saving...' : 'Save Gallery'}
                  </button>
                </div>
              </>
            )}
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

      {/* ---------- CUSTOM LAMP ORDERS TAB ---------- */}
      {activeTab === 'custom-orders' && (
        <div>
          <div className="admin-order-filter-row">
            <h2 className="section-header">CUSTOM LAMP ORDERS</h2>
            <div className="admin-order-filter-controls">
              <label>
                Filter by status:
                <select
                  value={customOrderStatusFilter}
                  onChange={(e) => setCustomOrderStatusFilter(e.target.value)}
                  className="admin-order-filter-select"
                >
                  <option value="all">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="awaiting_deposit">Awaiting Deposit</option>
                  <option value="deposit_paid">Deposit Paid</option>
                  <option value="reviewing_assets">Reviewing Assets</option>
                  <option value="in_production">In Production</option>
                  <option value="ready_to_ship">Ready To Ship</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              {customOrderStatusFilter !== 'all' && (
                <button
                  type="button"
                  className="admin-order-filter-clear"
                  onClick={() => setCustomOrderStatusFilter('all')}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
          <div className="admin-order-filter-summary">
            Showing {customOrders?.length || 0} custom lamp {customOrders?.length === 1 ? 'order' : 'orders'}
            {customOrderStatusFilter !== 'all' && (
              <span className="admin-order-filter-badge">
                {CUSTOM_ORDER_STATUS_LABELS[customOrderStatusFilter] || customOrderStatusFilter}
              </span>
            )}
          </div>

          {!customOrders || customOrders.length === 0 ? (
            <div className="empty-state">No custom lamp orders found yet.</div>
          ) : (
            <div className="admin-orders-grid">
              {customOrders.map((order) => (
                <div key={order._id} className="admin-order-card admin-custom-order-card">
                  <div className="admin-order-header">
                    <div>
                      <div className="admin-order-title">
                        {order.orderId}
                      </div>
                      <div className="admin-order-meta">
                        <span>
                          <span className="label">Product:</span> {order.productName}
                        </span>
                        <span>
                          <span className="label">Type:</span> {order.productType || 'panel'}
                        </span>
                        <span>
                          <span className="label">Panels:</span> {order.panels}
                        </span>
                        <span>
                          <span className="label">Panel Count:</span> {order.panelCount || '-'}
                        </span>
                        <span>
                          <span className="label">Size:</span> {order.size}
                        </span>
                        <span>
                          <span className="label">Light:</span> {formatLightTypeForDisplay(order.lightType, { internal: true })}
                        </span>
                      </div>
                      <div className="admin-order-meta">
                        <span>
                          <span className="label">Customer:</span> {order.customer?.name || 'Unknown'}
                        </span>
                        <span>
                          <span className="label">Email:</span> {order.customer?.email || 'Unknown'}
                        </span>
                        <span>
                          <span className="label">Phone:</span> {order.customer?.phone || 'Unknown'}
                        </span>
                      </div>
                      <div className="admin-order-meta">
                        <span>
                          <span className="label">Status:</span> {order.status}
                        </span>
                        <span>
                          <span className="label">Payment:</span> {order.paymentStatus || 'pending'}
                        </span>
                      </div>
                    </div>

                    <div className="admin-order-status-wrap">
                      <select
                        value={order.status || 'submitted'}
                        onChange={(e) =>
                          handleCustomOrderStatusChange(order.orderId, e.target.value)
                        }
                        className="admin-order-status-select"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="awaiting_deposit">Awaiting Deposit</option>
                        <option value="deposit_paid">Deposit Paid</option>
                        <option value="reviewing_assets">Reviewing Assets</option>
                        <option value="in_production">In Production</option>
                        <option value="ready_to_ship">Ready To Ship</option>
                        <option value="shipped">Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-order-items">
                    <div className="custom-order-details-section">
                      <div className="custom-order-detail-row">
                        <span className="label">Customer Notes:</span>
                        <span>{order.notes || '(none)'}</span>
                      </div>
                      <div className="custom-order-detail-row">
                        <span className="label">Add-ons:</span>
                        <span>{order.extras && order.extras.length ? order.extras.join(', ') : 'None'}</span>
                      </div>
                      {order.productType === 'cylinder' && (
                        <div className="custom-order-detail-row">
                          <span className="label">Image Style:</span>
                          <span>{order.cylinderOptions?.imageStyle || '-'}</span>
                        </div>
                      )}
                      {order.productType === 'fixedBox4' && (
                        <>
                          <div className="custom-order-detail-row">
                            <span className="label">Lid Type:</span>
                            <span>{order.boxOptions?.lidType || '-'}</span>
                          </div>
                          <div className="custom-order-detail-row">
                            <span className="label">Top Image:</span>
                            <span>{order.boxOptions?.topImageIncluded ? 'Included' : 'Not included'}</span>
                          </div>
                          <div className="custom-order-detail-row">
                            <span className="label">Lighting:</span>
                            <span>{order.boxOptions?.lightingIncluded ? 'Included' : 'Not included'}</span>
                          </div>
                        </>
                      )}
                      {order.productType === 'swappableBox5' && (
                        <>
                          <div className="custom-order-detail-row">
                            <span className="label">Extra Panel Set:</span>
                            <span>{order.boxModularOptions?.extraPanelSet ? 'Included' : 'Not included'}</span>
                          </div>
                          <div className="custom-order-detail-row">
                            <span className="label">Lighting:</span>
                            <span>{order.boxModularOptions?.lightingIncluded ? 'Included' : 'Not included'}</span>
                          </div>
                          {order.boxModularOptions?.panelImages?.length ? (
                            <div className="custom-order-detail-row">
                              <span className="label">Panel Images:</span>
                              <span>{order.boxModularOptions.panelImages.join(', ')}</span>
                            </div>
                          ) : null}
                        </>
                      )}
                      <div className="custom-order-detail-row">
                        <span className="label">Total Price:</span>
                        <span>${order.totalPrice?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="custom-order-detail-row">
                        <span className="label">Deposit:</span>
                        <span>${order.depositAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="custom-order-detail-row">
                        <span className="label">Balance Due:</span>
                        <span>${order.remainingBalance?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="custom-order-detail-row">
                        <span className="label">Shipping:</span>
                        <span>{order.customer?.shippingAddress ? `${order.customer.shippingAddress.street}, ${order.customer.shippingAddress.city}, ${order.customer.shippingAddress.state} ${order.customer.shippingAddress.zipCode}, ${order.customer.shippingAddress.country}` : 'Not provided'}</span>
                      </div>
                      <div className="custom-order-detail-row">
                        <span className="label">Tracking:</span>
                        <span>{order.trackingCarrier ? `${order.trackingCarrier} / ${order.trackingNumber}` : 'N/A'}</span>
                      </div>
                      {order.trackingUrl && (
                        <div className="custom-order-detail-row">
                          <span className="label">Track URL:</span>
                          <span><a href={order.trackingUrl} target="_blank" rel="noreferrer">{order.trackingUrl}</a></span>
                        </div>
                      )}
                      <div className="custom-order-detail-row">
                        <span className="label">Images Uploaded:</span>
                        <span>{order.images?.length || 0}</span>
                      </div>
                      {order.images && order.images.length > 0 && (
                        <div className="custom-order-images-list">
                          <span className="label">Image Files:</span>
                          <ul>
                            {order.images.map((img, idx) => (
                              <li key={idx}>
                                Panel {img.panel}: {img.originalName} ({(img.size / 1024).toFixed(1)}KB)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="admin-custom-order-notes">
                    <label>Admin Notes:</label>
                    <textarea
                      value={order.adminNotes || ''}
                      onChange={(e) => {
                        setCustomOrders((prev) =>
                          prev.map((o) =>
                            o.orderId === order.orderId
                              ? { ...o, adminNotes: e.target.value }
                              : o
                          )
                        );
                      }}
                      onBlur={() => handleCustomOrderNotesChange(order.orderId, order.adminNotes)}
                      className="admin-notes-textarea"
                      placeholder="Add admin notes (e.g., image quality check, approve for printing)"
                      rows="3"
                    />
                  </div>

                  <div className="admin-order-footer">
                    <span className="admin-order-created-at">
                      Submitted:{' '}
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString()
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- PROMO CODES TAB ---------- */}
      {activeTab === 'promo-codes' && (
        <div>
          <h2 className="section-header">PROMO CODES</h2>

          {!canManagePromos && (
            <div className="empty-state">You do not have permission to manage promo codes.</div>
          )}

          {canManagePromos && (
            <div className="promo-tools">
              <div className="promo-tools-actions">
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => handlePromoExport('json')}
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => handlePromoExport('csv')}
                >
                  Export CSV
                </button>
              </div>
              <label className="promo-import-label">
                Import (JSON or CSV)
                <input
                  type="file"
                  accept=".json,.csv"
                  className="promo-import-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handlePromoImport(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          )}

          {canManagePromos && (
            <form onSubmit={handleSubmitPromo}>
            <div className="form-grid">
              <input
                className="form-input"
                name="code"
                placeholder="Code (e.g. WELCOME10)"
                value={promoForm.code}
                onChange={handlePromoChange}
              />
              <input
                className="form-input"
                name="description"
                placeholder="Description"
                value={promoForm.description}
                onChange={handlePromoChange}
              />
              <select
                className="form-input"
                name="discountType"
                value={promoForm.discountType}
                onChange={handlePromoChange}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
              <input
                className="form-input"
                name="discountValue"
                type="number"
                placeholder="Discount Value"
                value={promoForm.discountValue}
                onChange={handlePromoChange}
              />
              <input
                className="form-input"
                name="usageLimit"
                type="number"
                placeholder="Usage Limit (optional)"
                value={promoForm.usageLimit}
                onChange={handlePromoChange}
              />
              <input
                className="form-input"
                name="minimumOrderAmount"
                type="number"
                placeholder="Minimum Order (optional)"
                value={promoForm.minimumOrderAmount}
                onChange={handlePromoChange}
              />
              <input
                className="form-input"
                name="allowedCategories"
                placeholder="Allowed Categories (comma separated)"
                value={promoForm.allowedCategories}
                onChange={handlePromoChange}
              />
              <input
                className="form-input"
                name="allowedProducts"
                placeholder="Allowed Product IDs (comma separated)"
                value={promoForm.allowedProducts}
                onChange={handlePromoChange}
              />
              <input
                className="form-input"
                name="expiresAt"
                type="date"
                value={promoForm.expiresAt}
                onChange={handlePromoChange}
              />
              <label style={{ color: '#ccc' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={promoForm.isActive}
                  onChange={handlePromoChange}
                />{' '}
                Active
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
              <button type="submit" className="primary-button">
                {editingPromoId ? 'Update Promo Code' : 'Create Promo Code'}
              </button>
              {editingPromoId && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetPromoForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
          )}

          {canManagePromos && (
            promoCodes.length === 0 ? (
              <div className="empty-state">No promo codes found yet.</div>
            ) : (
              <div className="promo-grid">
                {promoCodes.map((promo) => (
                  <div key={promo._id} className="promo-card">
                    <div className="promo-card-header">
                      <div className="promo-code">{promo.code}</div>
                      <span className={`promo-badge ${promo.isActive ? 'active' : 'inactive'}`}>
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="promo-description">
                      {promo.description || 'No description'}
                    </div>
                    <div className="promo-meta">
                      <span>
                        {promo.discountType === 'percentage'
                          ? `${promo.discountValue}% off`
                          : `$${promo.discountValue} off`}
                      </span>
                      <span>
                        Usage: {promo.usageCount || 0}
                        {promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                      </span>
                      {promo.minimumOrderAmount > 0 && (
                        <span>Min Order: ${promo.minimumOrderAmount.toFixed(2)}</span>
                      )}
                      {promo.expiresAt && (
                        <span>Expires: {new Date(promo.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="promo-meta">
                      {promo.allowedCategories?.length > 0 && (
                        <span>Categories: {promo.allowedCategories.join(', ')}</span>
                      )}
                      {promo.allowedProducts?.length > 0 && (
                        <span>Products: {promo.allowedProducts.join(', ')}</span>
                      )}
                    </div>

                    <div className="promo-actions">
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => handleEditPromo(promo)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => handleTogglePromoActive(promo)}
                      >
                        {promo.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="danger-button small-button"
                        onClick={() => {
                          const first = window.confirm(`Delete promo code ${promo.code}? This cannot be undone.`);
                          if (!first) return;
                          const second = window.confirm('Please confirm again to permanently delete this promo code.');
                          if (!second) return;
                          const typed = window.prompt(`Type ${promo.code} to confirm deletion:`);
                          const normalizedTyped = (typed || '').replace(/[\s_-]+/g, '').toUpperCase();
                          const normalizedCode = promo.code.replace(/[\s_-]+/g, '').toUpperCase();
                          if (normalizedTyped !== normalizedCode) {
                            warningToast('Promo code deletion cancelled');
                            return;
                          }
                          handleDeletePromo(promo._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ---------- PROMO AUDIT TAB ---------- */}
      {activeTab === 'promo-audit' && (
        <div>
          <h2 className="section-header">PROMO AUDIT</h2>

          {!canManagePromos && (
            <div className="empty-state">You do not have permission to view promo audit logs.</div>
          )}

          {canManagePromos && (
            <>
              <div className="promo-audit-toolbar">
                <input
                  className="form-input promo-audit-input"
                  name="promoCode"
                  placeholder="Promo code"
                  value={promoAuditFilters.promoCode}
                  onChange={handlePromoAuditFilterChange}
                />
                <select
                  className="form-input promo-audit-input"
                  name="action"
                  value={promoAuditFilters.action}
                  onChange={handlePromoAuditFilterChange}
                >
                  <option value="">All actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="enable">Enable</option>
                  <option value="disable">Disable</option>
                  <option value="delete">Delete</option>
                  <option value="import">Import</option>
                  <option value="export">Export</option>
                </select>
                <input
                  className="form-input promo-audit-input"
                  name="actor"
                  placeholder="Actor username"
                  value={promoAuditFilters.actor}
                  onChange={handlePromoAuditFilterChange}
                />
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={applyPromoAuditFilters}
                >
                  Apply Filters
                </button>
              </div>

              {isLoadingPromoAudit ? (
                <div className="promo-audit-loading">
                  <span className="spinner" /> Loading audit logs...
                </div>
              ) : promoAuditLogs.length === 0 ? (
                <div className="empty-state">No promo audit logs found.</div>
              ) : (
                <div className="promo-audit-table">
                  <div className="promo-audit-row promo-audit-header">
                    <div>Time</div>
                    <div>Action</div>
                    <div>Code</div>
                    <div>Actor</div>
                    <div>Meta</div>
                  </div>
                  {promoAuditLogs.map((entry) => (
                    <div key={entry._id} className="promo-audit-row">
                      <div>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</div>
                      <div className={`promo-audit-action ${entry.action}`}>{entry.action}</div>
                      <div>{entry.promoCode || '-'}</div>
                      <div>{entry.actor?.username || '-'} {entry.actor?.role ? `(${entry.actor.role})` : ''}</div>
                      <div className="promo-audit-meta">{formatPromoAuditMeta(entry)}</div>
                    </div>
                  ))}
                </div>
              )}

              {promoAuditTotal > 0 && (
                <div className="promo-audit-pagination">
                  <button
                    type="button"
                    className="secondary-button small-button"
                    disabled={promoAuditPage === 0}
                    onClick={() => setPromoAuditPage((prev) => Math.max(0, prev - 1))}
                  >
                    Previous
                  </button>
                  <span className="promo-audit-page">
                    Page {promoAuditPage + 1} of {Math.max(1, Math.ceil(promoAuditTotal / 25))}
                  </span>
                  <button
                    type="button"
                    className="secondary-button small-button"
                    disabled={(promoAuditPage + 1) * 25 >= promoAuditTotal}
                    onClick={() => setPromoAuditPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
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
