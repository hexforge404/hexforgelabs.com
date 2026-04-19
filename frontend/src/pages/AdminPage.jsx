import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminPage.css';
import API_BASE_URL from '../utils/apiBase';
import { successToast, errorToast, warningToast } from '../utils/toastUtils';
import InventoryViewer from '../components/InventoryViewer';
import { useAdmin } from '../context/AdminContext';
import { resolveImageUrl } from '../utils/resolveImageUrl';

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

const FULFILLMENT_STAGES = [
  'awaiting_deposit',
  'deposit_paid',
  'reviewing_assets',
  'print_ready',
  'in_production',
  'printed',
  'assembled',
  'packed',
  'shipped',
  'completed',
];

const FULFILLMENT_STAGE_LABELS = {
  awaiting_deposit: 'Awaiting Deposit',
  deposit_paid: 'Deposit Paid',
  reviewing_assets: 'Reviewing Assets',
  print_ready: 'Print Ready',
  in_production: 'In Production',
  printed: 'Printed',
  assembled: 'Assembled',
  packed: 'Packed',
  shipped: 'Shipped',
  completed: 'Completed',
};

const formatLightTypeForDisplay = (lightType, { internal = false } = {}) => {
  if (lightType === 'rgb') {
    return internal ? 'Legacy RGB option' : 'LED';
  }
  if (!lightType) return '—';
  return lightType;
};

const getOrderAuditWarnings = (order) => {
  const warnings = [];
  const paymentStatus = String(order.paymentStatus || '').toLowerCase();
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  const pendingThresholdMinutes = Number(process.env.REACT_APP_PAYMENT_PENDING_THRESHOLD_MINUTES || 30);
  const thresholdDate = new Date(Date.now() - pendingThresholdMinutes * 60 * 1000);

  if (!order.stripeSessionId && !order.paymentIntentId) {
    warnings.push('Missing Stripe linkage');
  }
  if (paymentStatus === 'pending' && createdAt && createdAt < thresholdDate) {
    warnings.push(`Pending payment > ${pendingThresholdMinutes} min`);
  }

  return warnings;
};

const normalizeCustomOrderImageUrl = (rawPath) => {
  if (!rawPath) return '';
  const raw = String(rawPath).trim();
  if (!raw) return '';
  if (/^data:/i.test(raw) || /^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/') || raw.startsWith('/images/')) return raw;
  const uploadsIndex = raw.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return raw.slice(uploadsIndex);
  }
  const fileName = raw.split('/').pop();
  if (!fileName || !fileName.includes('.')) return '';
  return `/uploads/custom-orders/${fileName}`;
};

export default function AdminPage() {
  const { admin } = useAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');

  // Products / Orders / Blog
  const [products, setProducts] = useState([]);
  const [existingNames, setExistingNames] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [customOrderStatusFilter, setCustomOrderStatusFilter] = useState('all');
  const [productionQueueFilter, setProductionQueueFilter] = useState('all');
  const [productionQueueSort, setProductionQueueSort] = useState('newest');
  const [expandedCustomOrders, setExpandedCustomOrders] = useState({});
  const [draggedOrderId, setDraggedOrderId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [printJobs, setPrintJobs] = useState([]);
  const [productionJobsByOrder, setProductionJobsByOrder] = useState({});
  const [fulfillmentPanelOrder, setFulfillmentPanelOrder] = useState(null);
  const [fulfillmentPanelJobs, setFulfillmentPanelJobs] = useState([]);
  const [selectedFulfillmentJobId, setSelectedFulfillmentJobId] = useState('');
  const [selectedFulfillmentBatchId, setSelectedFulfillmentBatchId] = useState('');
  const [isFulfillmentPanelOpen, setIsFulfillmentPanelOpen] = useState(false);
  const [isLoadingFulfillmentPanel, setIsLoadingFulfillmentPanel] = useState(false);
  const [fulfillmentStlFilename, setFulfillmentStlFilename] = useState('');
  const [fulfillmentStlPath, setFulfillmentStlPath] = useState('');
  const [fulfillmentStlVersion, setFulfillmentStlVersion] = useState('');
  const [printJobStatusFilter, setPrintJobStatusFilter] = useState('all');
  const selectedFulfillmentJob = (fulfillmentPanelJobs || []).find((j) => j.printJobId === selectedFulfillmentJobId) || null;
  const activeFulfillmentStatuses = [
    'queued_for_generation',
    'generating_stl',
    'stl_ready',
    'queued_for_slicing',
    'queued_for_batch',
    'assigned_to_printer',
    'printing',
  ];
  const isActiveFulfillmentJob = (job) => job && activeFulfillmentStatuses.includes(job.status);
  const [lithophaneJobs, setLithophaneJobs] = useState([]);
  const [lithophaneStatusFilter, setLithophaneStatusFilter] = useState('all');
  const [batchStatusFilter, setBatchStatusFilter] = useState('all');
  const [batches, setBatches] = useState([]);
  const [isLoadingPrintJobs, setIsLoadingPrintJobs] = useState(false);
  const [isLoadingLithophaneJobs, setIsLoadingLithophaneJobs] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [stlEditsByJob, setStlEditsByJob] = useState({});
  const [posts, setPosts] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedFulfillmentJob) {
      setFulfillmentStlFilename(selectedFulfillmentJob.stlFilename || '');
      setFulfillmentStlPath(selectedFulfillmentJob.stlPath || '');
      setFulfillmentStlVersion(selectedFulfillmentJob.stlVersion || '');
      setSelectedFulfillmentBatchId(selectedFulfillmentJob.assignedBatchId || '');
    } else {
      setFulfillmentStlFilename('');
      setFulfillmentStlPath('');
      setFulfillmentStlVersion('');
      setSelectedFulfillmentBatchId('');
    }
  }, [selectedFulfillmentJob]);

  useEffect(() => {
    if (selectedFulfillmentJobId && !selectedFulfillmentJob) {
      setSelectedFulfillmentJobId((fulfillmentPanelJobs || [])[0]?.printJobId || '');
    }
  }, [selectedFulfillmentJob, selectedFulfillmentJobId, fulfillmentPanelJobs]);

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
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [paymentAuditItems, setPaymentAuditItems] = useState([]);
  const [monitoringSummary, setMonitoringSummary] = useState(null);
  const [isLoadingMonitoring, setIsLoadingMonitoring] = useState(false);
  const [monitoringError, setMonitoringError] = useState(null);

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

  const [testPipelineLoading, setTestPipelineLoading] = useState(false);
  const [testPipelineStatus, setTestPipelineStatus] = useState('');
  const [testPipelineLog, setTestPipelineLog] = useState([]);
  const [testPipelineTestRunId, setTestPipelineTestRunId] = useState('');
  const [testPipelineOrderId, setTestPipelineOrderId] = useState('');
  const [testPipelinePrintJobId, setTestPipelinePrintJobId] = useState('');
  const [testPipelineBatchId, setTestPipelineBatchId] = useState('');
  const [testPipelineEnvAvailable, setTestPipelineEnvAvailable] = useState(false);
  const [testPipelineRuntimeEnabled, setTestPipelineRuntimeEnabled] = useState(false);
  const [testPipelineEffectiveEnabled, setTestPipelineEffectiveEnabled] = useState(false);
  const [testPipelineRuntimeUpdatedAt, setTestPipelineRuntimeUpdatedAt] = useState(null);
  const [testPipelineRuntimeUpdatedBy, setTestPipelineRuntimeUpdatedBy] = useState(null);
  const [testPipelineRuntimeExpired, setTestPipelineRuntimeExpired] = useState(false);
  const [testPipelineAutoDisableAfterMinutes, setTestPipelineAutoDisableAfterMinutes] = useState(30);
  const [testPipelineModeMessage, setTestPipelineModeMessage] = useState('');
  const [isLoadingTestPipelineStatus, setIsLoadingTestPipelineStatus] = useState(false);
  const [isUpdatingRuntimeStatus, setIsUpdatingRuntimeStatus] = useState(false);
  const [testArtifacts, setTestArtifacts] = useState({
    confirmed: { orders: [], printJobs: [], batches: [] },
    suspected: { orders: [], printJobs: [], batches: [] },
  });
  const [isLoadingTestArtifacts, setIsLoadingTestArtifacts] = useState(false);
  const [testPipelineResult, setTestPipelineResult] = useState(null);
  const [testPipelineStepStates, setTestPipelineStepStates] = useState({
    createOrder: 'idle',
    simulatePayment: 'idle',
    createPrintJob: 'idle',
    applyStl: 'idle',
    createBatch: 'idle',
    assignJob: 'idle',
  });
  const [isResultExpanded, setIsResultExpanded] = useState(true);

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
    if (activeTab !== 'monitoring') return;

    const loadMonitoring = async () => {
      setIsLoadingMonitoring(true);
      setMonitoringError(null);
      try {
        const [webhookRes, paymentRes, summaryRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/webhook-events?limit=60`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/admin/orders/payment-status?type=all&limit=60`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/admin/monitoring/summary`, { withCredentials: true }),
        ]);

        setWebhookEvents(webhookRes.data?.data || []);
        setPaymentAuditItems(paymentRes.data?.data || []);
        setMonitoringSummary(summaryRes.data?.summary || null);
      } catch (err) {
        console.error('Failed to load monitoring data:', err);
        setMonitoringError(err.response?.data?.error || err.message || 'Failed to load monitoring data');
      } finally {
        setIsLoadingMonitoring(false);
      }
    };

    loadMonitoring();
    const intervalId = setInterval(loadMonitoring, 15000);
    return () => clearInterval(intervalId);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'test-pipeline') return;

    const loadTestPipelineStatus = async () => {
      setIsLoadingTestPipelineStatus(true);
      try {
        const statusRes = await axios.get(`${API_BASE_URL}/admin/test-pipeline/runtime-status`, { withCredentials: true });
        const body = statusRes.data || {};
        setTestPipelineEnvAvailable(Boolean(body.envAvailable));
        setTestPipelineRuntimeEnabled(Boolean(body.runtimeEnabled));
        setTestPipelineEffectiveEnabled(Boolean(body.effectiveEnabled));
        setTestPipelineRuntimeUpdatedAt(body.updatedAt || null);
        setTestPipelineRuntimeUpdatedBy(body.updatedBy || null);
        setTestPipelineRuntimeExpired(Boolean(body.expired));
        setTestPipelineAutoDisableAfterMinutes(body.autoDisableAfterMinutes || 30);
        setTestPipelineModeMessage(body.message || 'Test Pipeline status unavailable.');
      } catch (err) {
        console.warn('Failed to load test pipeline status:', err.message || err);
        setTestPipelineEnvAvailable(false);
        setTestPipelineRuntimeEnabled(false);
        setTestPipelineEffectiveEnabled(false);
        setTestPipelineModeMessage('Unable to determine test pipeline status.');
      } finally {
        setIsLoadingTestPipelineStatus(false);
      }
    };

    const loadTestArtifacts = async () => {
      setIsLoadingTestArtifacts(true);
      try {
        const artifactsRes = await axios.get(`${API_BASE_URL}/admin/test-artifacts`, {
          params: { includeSuspected: true, limit: 200 },
          withCredentials: true,
        });
        const body = artifactsRes.data || {};
        setTestArtifacts({
          confirmed: body.confirmed || { orders: [], printJobs: [], batches: [] },
          suspected: body.suspected || { orders: [], printJobs: [], batches: [] },
        });
      } catch (err) {
        console.warn('Failed to load test artifacts:', err.message || err);
      } finally {
        setIsLoadingTestArtifacts(false);
      }
    };

    loadTestPipelineStatus();
    loadTestArtifacts();
  }, [activeTab]);

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
  }, [
    activeTab,
    canManagePromos,
    promoAuditPage,
    promoAuditQueryToken,
    promoAuditFilters.promoCode,
    promoAuditFilters.action,
    promoAuditFilters.actor,
  ]);

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

  const fetchProductionJobsForOrders = useCallback(async (orderIds = []) => {
    if (!Array.isArray(orderIds) || orderIds.length === 0) return {};
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/print-jobs`, {
        params: {
          orderIds: orderIds.join(','),
        },
        withCredentials: true,
      });
      const jobs = response.data?.data || [];
      return jobs.reduce((acc, job) => {
        if (job.orderId) acc[job.orderId] = job;
        return acc;
      }, {});
    } catch (err) {
      console.error('Failed to fetch production jobs for orders:', err);
      return {};
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'custom-orders' && activeTab !== 'production-queue') return;
    const loadFilteredCustomOrders = async () => {
      const targetStatus = activeTab === 'custom-orders' ? customOrderStatusFilter : 'all';
      const customOrderData = await fetchCustomOrders(targetStatus);
      setCustomOrders(customOrderData);
      const orderIds = customOrderData.map((order) => order.orderId).filter(Boolean);
      if (orderIds.length) {
        const jobsByOrder = await fetchProductionJobsForOrders(orderIds);
        setProductionJobsByOrder(jobsByOrder);
      } else {
        setProductionJobsByOrder({});
      }
    };
    loadFilteredCustomOrders();
  }, [activeTab, customOrderStatusFilter, fetchProductionJobsForOrders]);

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


  const ALLOWED_FULFILLMENT_TRANSITIONS = {
    awaiting_deposit: ['deposit_paid'],
    deposit_paid: ['awaiting_deposit', 'reviewing_assets'],
    reviewing_assets: ['deposit_paid', 'print_ready'],
    print_ready: ['reviewing_assets', 'in_production'],
    in_production: ['print_ready', 'printed'],
    printed: ['in_production', 'assembled'],
    assembled: ['printed', 'packed'],
    packed: ['assembled', 'shipped'],
    shipped: ['packed', 'completed'],
    completed: ['shipped'],
  };

  const getOrderStage = (order) => {
    const stage = order.fulfillmentStatus || order.status || 'submitted';
    return stage === 'ready_to_ship' ? 'print_ready' : stage;
  };

  const isAllowedFulfillmentTransition = (fromStage, toStage) => {
    if (!fromStage || !toStage) return false;
    if (fromStage === toStage) return true;
    return ALLOWED_FULFILLMENT_TRANSITIONS[fromStage]?.includes(toStage) || false;
  };

  const fetchPrintJobs = useCallback(async (status = 'all') => {
    try {
      const params = {};
      if (status && status !== 'all') {
        params.status = status;
      }
      const response = await axios.get(`${API_BASE_URL}/admin/print-jobs`, {
        params,
        withCredentials: true,
      });
      return response.data?.data || [];
    } catch (err) {
      console.error('Failed to fetch print jobs:', err);
      return [];
    }
  }, []);

  const fetchPrintJobsForOrder = useCallback(async (orderId) => {
    if (!orderId) return [];
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/print-jobs`, {
        params: { orderId },
        withCredentials: true,
      });
      return response.data?.data || [];
    } catch (err) {
      console.error('Failed to fetch print jobs for order:', err);
      return [];
    }
  }, []);

  const fetchLithophaneJobs = useCallback(async (status = 'all') => {
    if (status === 'all') {
      return fetchPrintJobs('queued_for_generation,generating_stl,stl_ready,queued_for_slicing');
    }
    return fetchPrintJobs(status);
  }, [fetchPrintJobs]);

  const fetchBatches = async (status = 'all') => {
    try {
      const params = {};
      if (status && status !== 'all') {
        params.status = status;
      }
      const response = await axios.get(`${API_BASE_URL}/admin/batches`, {
        params,
        withCredentials: true,
      });
      return response.data?.data || [];
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      return [];
    }
  };

  useEffect(() => {
    if (activeTab !== 'print-jobs') return;
    const loadPrintJobs = async () => {
      setIsLoadingPrintJobs(true);
      const jobs = await fetchPrintJobs(printJobStatusFilter);
      setPrintJobs(jobs);
      setIsLoadingPrintJobs(false);
    };

    loadPrintJobs();
  }, [activeTab, printJobStatusFilter, fetchPrintJobs]);

  useEffect(() => {
    if (activeTab !== 'lithophane') return;
    const loadLithophaneJobs = async () => {
      setIsLoadingLithophaneJobs(true);
      const jobs = await fetchLithophaneJobs(lithophaneStatusFilter);
      setLithophaneJobs(jobs);
      setIsLoadingLithophaneJobs(false);
    };

    loadLithophaneJobs();
  }, [activeTab, lithophaneStatusFilter, fetchLithophaneJobs]);

  useEffect(() => {
    if (activeTab !== 'batches' && activeTab !== 'print-jobs') return;
    const loadBatches = async () => {
      setIsLoadingBatches(true);
      const batchList = await fetchBatches(batchStatusFilter);
      setBatches(batchList);
      setIsLoadingBatches(false);
    };

    loadBatches();
  }, [activeTab, batchStatusFilter]);

  const handleCreateBatchFromPrintJob = async (job) => {
    try {
      const endpoint = job.isTest
        ? `${API_BASE_URL}/admin/batches`
        : `${API_BASE_URL}/admin/production/print-jobs/${encodeURIComponent(job.printJobId)}/create-batch`;
      const payload = job.isTest
        ? {
            printerProfile: job.printerProfile,
            materialProfile: job.materialProfile,
            slicerProfile: job.slicerProfile,
            nozzle: job.nozzle,
            layerHeight: job.layerHeight,
            printJobIds: [job.printJobId],
            status: 'queued_for_batch',
            notes: `Created from print job ${job.printJobId}`,
          }
        : {};

      const response = await axios.post(endpoint, payload, { withCredentials: true });
      const createdBatch = job.isTest ? response.data : response.data.batch;

      setBatches((prev) => [createdBatch, ...prev]);
      setPrintJobs((prev) =>
        prev.map((existingJob) =>
          existingJob.printJobId === job.printJobId
            ? { ...existingJob, assignedBatchId: createdBatch.batchId }
            : existingJob
        )
      );
      successToast(`Batch ${createdBatch.batchId} created and assigned.`);
      return createdBatch;
    } catch (err) {
      console.error('Create batch from print job error:', err.response || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to create batch';
      errorToast(msg);
      return null;
    }
  };

  const handleAssignPrintJobToBatch = async (job, batchId) => {
    try {
      const endpoint = job.isTest
        ? `${API_BASE_URL}/admin/batches/${encodeURIComponent(batchId)}/assign`
        : `${API_BASE_URL}/admin/production/print-jobs/${encodeURIComponent(job.printJobId)}/assign-batch`;
      const payload = job.isTest ? { printJobId: job.printJobId } : { batchId };

      const response = await axios.post(endpoint, payload, { withCredentials: true });
      const updatedBatch = job.isTest ? response.data : response.data.batch;
      setBatches((prev) => prev.map((batch) => (batch.batchId === updatedBatch.batchId ? updatedBatch : batch)));
      setPrintJobs((prev) =>
        prev.map((existingJob) =>
          existingJob.printJobId === job.printJobId
            ? { ...existingJob, assignedBatchId: updatedBatch.batchId }
            : existingJob
        )
      );
      successToast(`Print job ${job.printJobId} assigned to batch ${batchId}.`);
      return updatedBatch;
    } catch (err) {
      console.error('Assign print job to batch error:', err.response || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to assign print job to batch';
      errorToast(msg);
      return null;
    }
  };

  const loadFulfillmentPanel = async (order) => {
    if (!order?.orderId) {
      return;
    }

    setIsLoadingFulfillmentPanel(true);
    setFulfillmentPanelOrder(order);
    setFulfillmentPanelJobs([]);
    setSelectedFulfillmentJobId('');
    setSelectedFulfillmentBatchId('');
    try {
      const jobs = await fetchPrintJobsForOrder(order.orderId) || [];
      const safeJobs = Array.isArray(jobs) ? jobs : [];
      setFulfillmentPanelJobs(safeJobs);

      if (safeJobs.length) {
        const activeJob = safeJobs.find((job) => ['queued_for_generation','generating_stl','stl_ready','queued_for_slicing','queued_for_batch','assigned_to_printer','printing'].includes(job.status));
        const firstJob = activeJob || safeJobs[0];
        if (firstJob?.printJobId) {
          setSelectedFulfillmentJobId(firstJob.printJobId);
        }
      }

      if (!Array.isArray(batches) || batches.length === 0) {
        const loadedBatches = await fetchBatches('all');
        setBatches(Array.isArray(loadedBatches) ? loadedBatches : []);
      }
      setIsFulfillmentPanelOpen(true);
    } catch (err) {
      console.error('Failed to load fulfillment panel:', err);
      errorToast('Failed to load fulfillment details.');
    } finally {
      setIsLoadingFulfillmentPanel(false);
    }
  };

  const handleOpenFulfillmentPanel = async (order) => {
    if (!order) return;
    await loadFulfillmentPanel(order);
  };

  const refreshFulfillmentPanelJobs = async () => {
    if (!fulfillmentPanelOrder?.orderId) return null;
    setIsLoadingFulfillmentPanel(true);
    try {
      const jobs = await fetchPrintJobsForOrder(fulfillmentPanelOrder.orderId) || [];
      const safeJobs = Array.isArray(jobs) ? jobs : [];
      setFulfillmentPanelJobs(safeJobs);

      const selectedStillExists = safeJobs.some((job) => job.printJobId === selectedFulfillmentJobId);
      if (!selectedStillExists && safeJobs.length) {
        const activeJob = safeJobs.find((job) => activeFulfillmentStatuses.includes(job.status));
        const firstJob = activeJob || safeJobs[0];
        setSelectedFulfillmentJobId(firstJob?.printJobId || '');
      }

      if (!Array.isArray(batches) || batches.length === 0) {
        const loadedBatches = await fetchBatches('all');
        setBatches(Array.isArray(loadedBatches) ? loadedBatches : []);
      }
      return safeJobs;
    } catch (err) {
      console.error('Failed to refresh fulfillment jobs:', err);
      errorToast('Failed to refresh fulfillment jobs.');
      return null;
    } finally {
      setIsLoadingFulfillmentPanel(false);
    }
  };

  const handleStartFulfillmentInPanel = async (order) => {
    if (!order?.orderId) {
      errorToast('Unable to start fulfillment: missing order information.');
      return null;
    }
    const createdJob = await handleStartFulfillment(order);
    if (createdJob) {
      setFulfillmentPanelJobs((prev) => [createdJob, ...prev]);
      setSelectedFulfillmentJobId(createdJob.printJobId);
      setProductionJobsByOrder((prev) => ({ ...prev, [order.orderId]: createdJob }));
    }
    return createdJob;
  };

  const handleApplyStlFromPanel = async () => {
    if (!selectedFulfillmentJob) {
      errorToast('Select a production job first.');
      return null;
    }
    if (!fulfillmentPanelOrder?.orderId) {
      errorToast('Missing order information for STL handoff.');
      return null;
    }
    if (!fulfillmentStlFilename.trim() || !fulfillmentStlPath.trim() || !fulfillmentStlVersion.trim()) {
      errorToast('STL filename, path, and version are all required.');
      return null;
    }
    const updatedJob = await handleUpdateStlHandoff({ ...selectedFulfillmentJob, isTest: false }, {
      stlFilename: fulfillmentStlFilename.trim(),
      stlPath: fulfillmentStlPath.trim(),
      stlVersion: fulfillmentStlVersion.trim(),
      status: 'stl_ready',
    });
    if (updatedJob) {
      setFulfillmentPanelJobs((prev) => prev.map((existingJob) =>
        existingJob.printJobId === updatedJob.printJobId ? updatedJob : existingJob
      ));
      setProductionJobsByOrder((prev) => ({ ...prev, [fulfillmentPanelOrder.orderId]: updatedJob }));
    }
    return updatedJob;
  };

  const handleCreateBatchFromPanel = async () => {
    if (!selectedFulfillmentJob) {
      errorToast('Select a production job first.');
      return null;
    }
    const createdBatch = await handleCreateBatchFromPrintJob({ ...selectedFulfillmentJob, isTest: false });
    if (createdBatch) {
      setFulfillmentPanelJobs((prev) => prev.map((existingJob) =>
        existingJob.printJobId === selectedFulfillmentJob.printJobId ? { ...existingJob, assignedBatchId: createdBatch.batchId } : existingJob
      ));
      setSelectedFulfillmentBatchId(createdBatch.batchId);
      if (fulfillmentPanelOrder?.orderId) {
        setProductionJobsByOrder((prev) => ({ ...prev, [fulfillmentPanelOrder.orderId]: { ...selectedFulfillmentJob, assignedBatchId: createdBatch.batchId } }));
      }
    }
    return createdBatch;
  };

  const handleAssignBatchFromPanel = async () => {
    if (!selectedFulfillmentJob) {
      errorToast('Select a production job first.');
      return null;
    }
    if (!selectedFulfillmentBatchId) {
      errorToast('Select a batch to assign.');
      return null;
    }
    if (!fulfillmentPanelOrder?.orderId) {
      errorToast('Missing order information for batch assignment.');
      return null;
    }
    const updatedBatch = await handleAssignPrintJobToBatch({ ...selectedFulfillmentJob, isTest: false }, selectedFulfillmentBatchId);
    if (updatedBatch) {
      setFulfillmentPanelJobs((prev) => prev.map((existingJob) =>
        existingJob.printJobId === selectedFulfillmentJob.printJobId ? { ...existingJob, assignedBatchId: updatedBatch.batchId } : existingJob
      ));
      setProductionJobsByOrder((prev) => ({ ...prev, [fulfillmentPanelOrder.orderId]: { ...selectedFulfillmentJob, assignedBatchId: updatedBatch.batchId } }));
    }
    return updatedBatch;
  };

  const handleForceRerunFromPanel = async () => {
    if (!fulfillmentPanelOrder?.orderId) return null;
    if (!window.confirm('Force rerun fulfillment will create a new production print job even if an active job already exists. Proceed?')) {
      return null;
    }
    const createdJob = await handleStartFulfillment(fulfillmentPanelOrder, { forceCreate: true });
    if (createdJob) {
      setFulfillmentPanelJobs((prev) => [createdJob, ...prev]);
      setSelectedFulfillmentJobId(createdJob.printJobId);
      setSelectedFulfillmentBatchId(createdJob.assignedBatchId || '');
      setProductionJobsByOrder((prev) => ({ ...prev, [fulfillmentPanelOrder.orderId]: createdJob }));
    }
    return createdJob;
  };

  const handleCloseFulfillmentPanel = () => {
    setIsFulfillmentPanelOpen(false);
    setFulfillmentPanelOrder(null);
    setFulfillmentPanelJobs([]);
    setSelectedFulfillmentJobId('');
    setSelectedFulfillmentBatchId('');
    setFulfillmentStlFilename('');
    setFulfillmentStlPath('');
    setFulfillmentStlVersion('');
  };


  const isCustomOrderPrintReady = (order) => {
    if (order?.isPrintReady !== undefined) {
      return order.isPrintReady;
    }
    const imageCount = Array.isArray(order.images) ? order.images.length : order.imagesCount || 0;
    const paid = ['paid_in_full', 'deposit_paid'].includes(order.paymentStatus);
    const status = order.fulfillmentStatus || order.status;
    const validStatus = !['cancelled', 'completed'].includes(status);
    return paid && imageCount > 0 && validStatus;
  };

  const getProductionQueueItems = useMemo(() => {
    if (!customOrders || !customOrders.length) return [];
    const all = [...customOrders];
    const filtered = all.filter((order) => {
      const imageCount = Array.isArray(order.images) ? order.images.length : order.imagesCount || 0;
      switch (productionQueueFilter) {
        case 'ready':
          return isCustomOrderPrintReady(order);
        case 'missing_images':
          return imageCount === 0;
        case 'pending_deposit':
          return order.paymentStatus === 'pending';
        case 'in_production':
          return (order.fulfillmentStatus || order.status) === 'in_production';
        case 'completed':
          return (order.fulfillmentStatus || order.status) === 'completed';
        default:
          return true;
      }
    });
    return filtered.sort((a, b) => {
      const totalA = Number(a.totalPrice || a.discountedTotal || 0);
      const totalB = Number(b.totalPrice || b.discountedTotal || 0);
      if (productionQueueSort === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (productionQueueSort === 'highest_total') {
        return totalB - totalA;
      }
      if (productionQueueSort === 'lowest_total') {
        return totalA - totalB;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [customOrders, productionQueueFilter, productionQueueSort]);

  const boardColumns = useMemo(
    () => FULFILLMENT_STAGES.map((stage) => ({
      stage,
      label: FULFILLMENT_STAGE_LABELS[stage],
      orders: getProductionQueueItems.filter((order) => getOrderStage(order) === stage),
    })),
    [getProductionQueueItems]
  );

  const handleKanbanDragStart = (event, orderId) => {
    try {
      event.dataTransfer.setData('text/plain', orderId);
      event.dataTransfer.effectAllowed = 'move';
    } catch (err) {
      // Some browsers may block dataTransfer writes on unsupported devices.
    }
    setDraggedOrderId(orderId);
  };

  const handleKanbanDragOver = (event, stage) => {
    event.preventDefault();
    setDragOverStage(stage);
  };

  const handleKanbanDragLeave = () => {
    setDragOverStage(null);
  };

  const handleKanbanDrop = async (event, destinationStage) => {
    event.preventDefault();
    setDragOverStage(null);
    const orderId = event.dataTransfer.getData('text/plain');
    if (!orderId) return;

    const order = customOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    const currentStage = getOrderStage(order);
    if (!isAllowedFulfillmentTransition(currentStage, destinationStage)) {
      errorToast(`Cannot move ${order.orderId} from ${FULFILLMENT_STAGE_LABELS[currentStage] || currentStage} to ${FULFILLMENT_STAGE_LABELS[destinationStage]}.`);
      setDraggedOrderId(null);
      return;
    }

    if (currentStage === destinationStage) {
      setDraggedOrderId(null);
      return;
    }

    const optimisticOrders = customOrders.map((o) =>
      o.orderId === orderId ? { ...o, fulfillmentStatus: destinationStage, status: destinationStage } : o
    );
    setCustomOrders(optimisticOrders);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/custom-orders/${orderId}`,
        { fulfillmentStatus: destinationStage },
        { withCredentials: true }
      );

      const updated = response.data;
      setCustomOrders((prev) => prev.map((o) => (o.orderId === orderId ? updated : o)));
      successToast(`Moved ${order.orderId} to ${FULFILLMENT_STAGE_LABELS[destinationStage]}.`);
    } catch (err) {
      setCustomOrders((prev) => prev.map((o) => (o.orderId === orderId ? order : o)));
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Unable to save stage change';
      errorToast(msg);
    } finally {
      setDraggedOrderId(null);
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
        { fulfillmentStatus: newStatus },
        { withCredentials: true }
      );

      const updated = response.data;
      setCustomOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? updated : o))
      );

      successToast(`Custom order fulfillment status updated to ${newStatus}`);
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

  const handleStartFulfillment = async (order, options = {}) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/production/print-jobs`,
        {
          orderId: order.orderId,
          customOrderId: order._id,
          productType: order.productType,
          notes: order.notes || '',
          forceCreate: options.forceCreate === true,
        },
        { withCredentials: true }
      );

      const createdJob = response.data;
      setProductionJobsByOrder((prev) => ({
        ...prev,
        [order.orderId]: createdJob,
      }));
      successToast(`Production print job ${createdJob.printJobId} created for ${order.orderId}`);
      if (activeTab === 'print-jobs') {
        setPrintJobs((prev) => [createdJob, ...prev]);
      }
      return createdJob;
    } catch (err) {
      console.error('Start fulfillment error:', err.response || err);
      const existingJob = err.response?.data?.existingJob;
      if (existingJob && !options.forceCreate) {
        setProductionJobsByOrder((prev) => ({
          ...prev,
          [order.orderId]: existingJob,
        }));
        successToast(`Active production print job already exists: ${existingJob.printJobId}`);
        return existingJob;
      }
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to start production fulfillment';
      errorToast(msg);
      return null;
    }
  };

  const handleForceRerunFulfillment = async (order) => {
    if (!window.confirm('Force rerun fulfillment will create a new production print job even if an active job already exists. Proceed?')) {
      return null;
    }
    return handleStartFulfillment(order, { forceCreate: true });
  };

  const handleApplyStlFromOrder = async (order) => {
    const job = productionJobsByOrder[order.orderId];
    if (!job) {
      errorToast('No linked production print job found for this order.');
      return null;
    }

    const defaultFilename = job.stlFilename || `${order.orderId.replace(/[^a-zA-Z0-9_-]/g, '-')}.stl`;
    const stlFilename = window.prompt('Enter STL filename for handoff:', defaultFilename);
    if (!stlFilename) return null;
    const stlPath = window.prompt('Enter STL path or URL:', job.stlPath || `/uploads/custom-orders/${order.orderId}/${stlFilename}`);
    const stlVersion = window.prompt('Enter STL version:', job.stlVersion || 'v1');

    const updatedJob = await handleUpdateStlHandoff({ ...job, isTest: false }, {
      stlFilename,
      stlPath,
      stlVersion,
      status: 'stl_ready',
    });
    if (updatedJob) {
      setProductionJobsByOrder((prev) => ({
        ...prev,
        [order.orderId]: updatedJob,
      }));
    }
    return updatedJob;
  };

  const handleCreateBatchFromOrder = async (order) => {
    const job = productionJobsByOrder[order.orderId];
    if (!job) {
      errorToast('No linked production print job found for this order.');
      return null;
    }
    const createdBatch = await handleCreateBatchFromPrintJob({ ...job, isTest: false });
    if (createdBatch) {
      setProductionJobsByOrder((prev) => ({
        ...prev,
        [order.orderId]: {
          ...job,
          assignedBatchId: createdBatch.batchId,
        },
      }));
    }
    return createdBatch;
  };

  const handleAssignBatchFromOrder = async (order) => {
    const job = productionJobsByOrder[order.orderId];
    if (!job) {
      errorToast('No linked production print job found for this order.');
      return null;
    }
    const batchId = window.prompt('Enter batch ID to assign this print job to:');
    if (!batchId) return null;
    const updatedBatch = await handleAssignPrintJobToBatch({ ...job, isTest: false }, batchId);
    if (updatedBatch) {
      setProductionJobsByOrder((prev) => ({
        ...prev,
        [order.orderId]: {
          ...job,
          assignedBatchId: updatedBatch.batchId,
        },
      }));
    }
    return updatedBatch;
  };

  const getProductionEligibilityBadge = (order) => {
    if (order.isTest) {
      return { label: 'Test order', variant: 'warning' };
    }

    const status = order.fulfillmentStatus || order.status;
    const paid = ['deposit_paid', 'paid_in_full'].includes(order.paymentStatus);
    const hasImages = Array.isArray(order.images) && order.images.length > 0;
    const terminal = ['cancelled', 'completed'].includes(status);

    if (terminal) {
      return { label: 'Fulfillment closed', variant: 'disabled' };
    }

    if (!paid) {
      return { label: 'Waiting payment', variant: 'warning' };
    }

    if (!hasImages) {
      return { label: 'Missing assets', variant: 'warning' };
    }

    return { label: 'Production eligible', variant: 'success' };
  };

  const handleOpenPrintJob = (job) => {
    if (!job) return;
    setActiveTab('print-jobs');
    setPrintJobStatusFilter('all');
    setPrintJobs((prev) => (prev.some((existing) => existing.printJobId === job.printJobId) ? prev : [job, ...prev]));
    successToast(`Opened print job ${job.printJobId}`);
  };

  const handleCreatePrintJob = async (order) => {
    return handleStartFulfillment(order);
  };

  const handleExportSlicerPacket = (printJobId) => {
    const url = `${API_BASE_URL}/admin/print-jobs/${encodeURIComponent(printJobId)}/slicer-packet.zip`;
    window.open(url, '_blank');
  };

  const handleExportLithophanePacket = (printJobId) => {
    const url = `${API_BASE_URL}/admin/print-jobs/${encodeURIComponent(printJobId)}/lithophane-packet.zip`;
    window.open(url, '_blank');
  };

  const handleStlEditChange = (printJobId, field, value) => {
    setStlEditsByJob((prev) => ({
      ...prev,
      [printJobId]: {
        ...(prev[printJobId] || {}),
        [field]: value,
      },
    }));
  };

  const handleUpdateStlHandoff = async (printJob, overrides = {}) => {
    const edits = stlEditsByJob[printJob.printJobId] || {};
    const payload = {
      stlFilename: edits.stlFilename !== undefined ? edits.stlFilename : printJob.stlFilename,
      stlPath: edits.stlPath !== undefined ? edits.stlPath : printJob.stlPath,
      stlVersion: edits.stlVersion !== undefined ? edits.stlVersion : printJob.stlVersion,
      generationNotes: edits.generationNotes !== undefined ? edits.generationNotes : printJob.generationNotes,
      status: overrides.status || edits.status || printJob.status,
    };

    try {
      const endpoint = printJob.isTest
        ? `${API_BASE_URL}/admin/print-jobs/${encodeURIComponent(printJob.printJobId)}/stl-handoff`
        : `${API_BASE_URL}/admin/production/print-jobs/${encodeURIComponent(printJob.printJobId)}/apply-stl`;
      const response = await axios.post(endpoint, payload, { withCredentials: true });
      const updatedJob = response.data;
      setPrintJobs((prev) => prev.map((jobItem) => (jobItem.printJobId === printJob.printJobId ? updatedJob : jobItem)));
      setLithophaneJobs((prev) => prev.map((jobItem) => (jobItem.printJobId === printJob.printJobId ? updatedJob : jobItem)));
      successToast(`STL handoff updated for ${printJob.printJobId}.`);
      return updatedJob;
    } catch (err) {
      console.error('Update STL handoff error:', err.response || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update STL handoff';
      errorToast(msg);
      return null;
    }
  };

  const handleUpdatePrintJob = async (printJobId, payload) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/print-jobs/${encodeURIComponent(printJobId)}`,
        payload,
        { withCredentials: true }
      );
      const updatedJob = response.data;
      setPrintJobs((prev) => prev.map((job) => (job.printJobId === printJobId ? updatedJob : job)));
      successToast(`Print job ${printJobId} updated.`);
      return updatedJob;
    } catch (err) {
      console.error('Update print job error:', err.response || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update print job';
      errorToast(msg);
      return null;
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

  const appendLog = (message) => {
    setTestPipelineLog((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const setStepState = (stepKey, value) => {
    setTestPipelineStepStates((prev) => ({
      ...prev,
      [stepKey]: value,
    }));
  };

  const extractApiError = (err) => {
    if (!err) return 'Unknown error';
    if (err.response?.data?.error) return err.response.data.error;
    if (err.response?.data?.message) return err.response.data.message;
    return err.message || 'Unknown error';
  };

  const handleToggleRuntimeStatus = async (enabled) => {
    if (!window.confirm(`Are you sure you want to ${enabled ? 'enable' : 'disable'} the runtime test pipeline?`)) {
      return;
    }

    setIsUpdatingRuntimeStatus(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/test-pipeline/runtime-status`,
        { enabled },
        { withCredentials: true }
      );
      const body = response.data || {};
      setTestPipelineEnvAvailable(Boolean(body.envAvailable));
      setTestPipelineRuntimeEnabled(Boolean(body.runtimeEnabled));
      setTestPipelineEffectiveEnabled(Boolean(body.effectiveEnabled));
      setTestPipelineRuntimeUpdatedAt(body.updatedAt || null);
      setTestPipelineRuntimeUpdatedBy(body.updatedBy || null);
      setTestPipelineRuntimeExpired(Boolean(body.expired));
      setTestPipelineAutoDisableAfterMinutes(body.autoDisableAfterMinutes || 30);
      setTestPipelineModeMessage(`Runtime mode ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      console.error('Failed to update runtime status:', err);
      errorToast(extractApiError(err));
    } finally {
      setIsUpdatingRuntimeStatus(false);
    }
  };

  const mergePipelineIds = (result) => {
    if (!result || typeof result !== 'object') return;

    if (result.testRunId) setTestPipelineTestRunId(result.testRunId);
    if (result.orderId) setTestPipelineOrderId(result.orderId);
    if (result.printJobId) setTestPipelinePrintJobId(result.printJobId);
    if (result.batchId) setTestPipelineBatchId(result.batchId);

    if (result.result?.order?.orderId) setTestPipelineOrderId(result.result.order.orderId);
    if (result.result?.printJob?.printJobId) setTestPipelinePrintJobId(result.result.printJob.printJobId);
    if (result.result?.batch?.batchId) setTestPipelineBatchId(result.result.batch.batchId);
  };

  const runPipelineAction = async (path, payload, statusLabel, stepKey) => {
    if (stepKey) setStepState(stepKey, 'running');
    setTestPipelineLoading(true);
    setTestPipelineStatus(statusLabel);
    appendLog(statusLabel);
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/test-pipeline/${path}`, payload, {
        withCredentials: true,
      });
      const result = response.data || {};
      mergePipelineIds(result);
      appendLog(`Success: ${statusLabel}`);
      if (stepKey) setStepState(stepKey, 'success');
      setTestPipelineResult(result);
      setTestPipelineStatus(`${statusLabel} completed`);
      return result;
    } catch (err) {
      const message = extractApiError(err);
      appendLog(`Error: ${statusLabel} failed — ${message}`);
      if (stepKey) setStepState(stepKey, 'error');
      setTestPipelineStatus(`Failed: ${message}`);
      throw err;
    } finally {
      setTestPipelineLoading(false);
    }
  };

  const resetPipelineState = ({ preserveTestRunId = false } = {}) => {
    setTestPipelineStatus('');
    setTestPipelineLog([]);
    setTestPipelineOrderId('');
    setTestPipelinePrintJobId('');
    setTestPipelineBatchId('');
    setTestPipelineResult(null);
    if (!preserveTestRunId) {
      setTestPipelineTestRunId('');
    }
    setTestPipelineStepStates({
      createOrder: 'idle',
      simulatePayment: 'idle',
      createPrintJob: 'idle',
      applyStl: 'idle',
      createBatch: 'idle',
      assignJob: 'idle',
    });
  };

  const resetPipelineSteps = () => {
    setTestPipelineStepStates({
      createOrder: 'idle',
      simulatePayment: 'idle',
      createPrintJob: 'idle',
      applyStl: 'idle',
      createBatch: 'idle',
      assignJob: 'idle',
    });
  };

  const handleCreateTestOrder = async () => {
    try {
      resetPipelineState({ preserveTestRunId: true });
      const payload = testPipelineTestRunId ? { testRunId: testPipelineTestRunId } : {};
      const result = await runPipelineAction('create-order', payload, 'Creating test order', 'createOrder');
      setTestPipelineTestRunId(result.testRunId || testPipelineTestRunId);
      setTestPipelineOrderId(result.orderId || '');
      return result;
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateTestPayment = async () => {
    try {
      if (!testPipelineOrderId && !testPipelineTestRunId) {
        appendLog('ERROR: Order ID or Test Run ID is required');
        return;
      }
      const payload = {
        orderId: testPipelineOrderId || undefined,
        testRunId: testPipelineTestRunId || undefined,
      };
      const result = await runPipelineAction('simulate-payment', payload, 'Simulating deposit payment', 'simulatePayment');
      setTestPipelineOrderId(result.orderId || testPipelineOrderId);
      return result;
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTestPrintJob = async () => {
    try {
      if (!testPipelineOrderId && !testPipelineTestRunId) {
        appendLog('ERROR: Order ID or Test Run ID is required');
        return;
      }
      const payload = {
        orderId: testPipelineOrderId || undefined,
        testRunId: testPipelineTestRunId || undefined,
      };
      const result = await runPipelineAction('create-print-job', payload, 'Creating test print job', 'createPrintJob');
      setTestPipelinePrintJobId(result.printJobId || '');
      return result;
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyTestStl = async () => {
    try {
      if (!testPipelinePrintJobId && !testPipelineTestRunId) {
        appendLog('ERROR: Print Job ID or Test Run ID is required');
        return;
      }
      const payload = {
        printJobId: testPipelinePrintJobId || undefined,
        testRunId: testPipelineTestRunId || undefined,
        stlFilename: `pipeline-${Date.now()}.stl`,
        stlPath: `/uploads/test-pipeline/stl-${Date.now()}.stl`,
        stlVersion: 'v1',
        generationNotes: 'STL handoff applied by test pipeline',
      };
      return await runPipelineAction('apply-stl', payload, 'Applying STL handoff', 'applyStl');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTestBatch = async () => {
    try {
      if (!testPipelinePrintJobId && !testPipelineTestRunId) {
        appendLog('ERROR: Print Job ID or Test Run ID is required');
        return;
      }
      const payload = {
        printJobId: testPipelinePrintJobId || undefined,
        testRunId: testPipelineTestRunId || undefined,
      };
      const result = await runPipelineAction('create-batch', payload, 'Creating batch from print job', 'createBatch');
      setTestPipelineBatchId(result.batchId || '');
      return result;
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTestJob = async () => {
    try {
      if (!testPipelinePrintJobId || !testPipelineBatchId) {
        appendLog('ERROR: Batch ID and Print Job ID are required');
        return;
      }
      return await runPipelineAction('assign-job', {
        printJobId: testPipelinePrintJobId,
        batchId: testPipelineBatchId,
        testRunId: testPipelineTestRunId || undefined,
      }, 'Assigning test job to batch');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunFullTestPipeline = async () => {
    try {
      resetPipelineSteps();
      setTestPipelineLog([]);
      setTestPipelineStatus('');
      const result = await runPipelineAction('run', {
        testRunId: testPipelineTestRunId || undefined,
      }, 'Running full test pipeline');
      setTestPipelineTestRunId(result.testRunId || testPipelineTestRunId);
      setTestPipelineOrderId(result.result?.order?.orderId || '');
      setTestPipelinePrintJobId(result.result?.printJob?.printJobId || '');
      setTestPipelineBatchId(result.result?.batch?.batchId || '');
      return result;
    } catch (err) {
      console.error(err);
    }
  };

  const handleCleanupTestData = async () => {
    try {
      if (!testPipelineTestRunId) {
        appendLog('ERROR: Test Run ID is required for cleanup');
        return;
      }
      const result = await runPipelineAction('cleanup', { testRunId: testPipelineTestRunId }, 'Cleaning up test pipeline data');
      if (result.success) {
        resetPipelineState();
      }
      return result;
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceCleanupAllTestData = async () => {
    try {
      if (!window.confirm('Force cleanup will delete ALL records marked isTest=true and remove associated test order assets. Proceed?')) {
        return;
      }
      setTestPipelineLoading(true);
      setTestPipelineStatus('Force cleaning up all test data');
      appendLog('Force cleanup initiated');
      const response = await axios.delete(`${API_BASE_URL}/admin/test-pipeline/force-cleanup`, {
        withCredentials: true,
      });
      const result = response.data || {};
      appendLog('Force cleanup completed');
      setTestPipelineStatus('Force cleanup completed');
      return result;
    } catch (err) {
      const message = extractApiError(err);
      appendLog(`Error: Force cleanup failed — ${message}`);
      setTestPipelineStatus(`Force cleanup failed: ${message}`);
      throw err;
    } finally {
      setTestPipelineLoading(false);
    }
  };

  const exportSlicerPacket = () => {
    if (!testPipelinePrintJobId) {
      appendLog('ERROR: Print Job ID is required to export a packet');
      return;
    }
    window.open(`${API_BASE_URL}/admin/print-jobs/${testPipelinePrintJobId}/slicer-packet.zip`, '_blank');
  };

  const exportLithophanePacket = () => {
    if (!testPipelinePrintJobId) {
      appendLog('ERROR: Print Job ID is required to export a packet');
      return;
    }
    window.open(`${API_BASE_URL}/admin/print-jobs/${testPipelinePrintJobId}/lithophane-packet.zip`, '_blank');
  };

  const formatJsonPreview = (data) => {
    if (!data) return '{}';
    try {
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return String(data);
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
      {testPipelineEffectiveEnabled && (
        <div className="admin-global-warning">
          ⚠ TEST PIPELINE ACTIVE — runtime test pipeline mode is enabled. Actions are gated and cleanup is available.
        </div>
      )}
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
        <button
          className={activeTab === 'production-queue' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('production-queue')}
        >
          Production Queue
        </button>
        <button
          className={activeTab === 'print-jobs' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('print-jobs')}
        >
          Print Jobs
        </button>
        <button
          className={activeTab === 'lithophane' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('lithophane')}
        >
          Lithophane
        </button>
        <button
          className={activeTab === 'batches' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('batches')}
        >
          Batches
        </button>
        <button
          className={activeTab === 'monitoring' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('monitoring')}
        >
          Monitoring
        </button>
        <button
          className={activeTab === 'test-pipeline' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('test-pipeline')}
        >
          Test Pipeline
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
                          <span className={getOrderAuditWarnings(order).length ? 'audit-badge warning' : 'audit-badge ok'}>
                            {getOrderAuditWarnings(order).length ? 'Attention' : 'Healthy'}
                          </span>
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

      {activeTab === 'monitoring' && (
        <div className="monitoring-tab">
          <h2 className="section-header">MONITORING</h2>
          {monitoringError && (
            <div className="status-message error-message">
              <span>{monitoringError}</span>
              <button onClick={() => setMonitoringError(null)} className="close-button">
                ×
              </button>
            </div>
          )}

          {isLoadingMonitoring ? (
            <div>Loading monitoring data…</div>
          ) : (
            <>
              {monitoringSummary && (
                <section className="monitoring-summary-grid">
                  <div className="monitoring-summary-card">
                    <span className="summary-label">Total Webhooks</span>
                    <span className="summary-value">{monitoringSummary.totalWebhooks}</span>
                  </div>
                  <div className="monitoring-summary-card">
                    <span className="summary-label">Failed Webhooks</span>
                    <span className="summary-value">{monitoringSummary.failedWebhooks}</span>
                  </div>
                  <div className="monitoring-summary-card">
                    <span className="summary-label">Pending Orders</span>
                    <span className="summary-value">{monitoringSummary.standardPendingAgedOrders + monitoringSummary.customPendingAgedOrders}</span>
                  </div>
                  <div className="monitoring-summary-card">
                    <span className="summary-label">Missing Stripe Linkage</span>
                    <span className="summary-value">{monitoringSummary.standardMissingStripeLinkage + monitoringSummary.customMissingStripeLinkage}</span>
                  </div>
                  <div className="monitoring-summary-card">
                    <span className="summary-label">Duplicate Payment Intents</span>
                    <span className="summary-value">{monitoringSummary.duplicatePaymentIntentEvents}</span>
                  </div>
                  <div className={`monitoring-summary-card summary-status ${
                    monitoringSummary.failedWebhooks > 0 ||
                    monitoringSummary.standardPendingAgedOrders + monitoringSummary.customPendingAgedOrders > 0 ||
                    monitoringSummary.standardMissingStripeLinkage + monitoringSummary.customMissingStripeLinkage > 0 ||
                    monitoringSummary.duplicatePaymentIntentEvents > 0
                      ? 'issue'
                      : 'normal'
                  }`}>
                    <span className="summary-label">Alert State</span>
                    <span className="summary-value">
                      {monitoringSummary.failedWebhooks > 0 ||
                      monitoringSummary.standardPendingAgedOrders + monitoringSummary.customPendingAgedOrders > 0 ||
                      monitoringSummary.standardMissingStripeLinkage + monitoringSummary.customMissingStripeLinkage > 0 ||
                      monitoringSummary.duplicatePaymentIntentEvents > 0
                        ? 'Attention'
                        : 'OK'}
                    </span>
                  </div>
                </section>
              )}
              <section className="monitoring-block">
                <h3>Webhook Audit Events</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Event ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Order ID</th>
                      <th>Timestamp</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookEvents.length === 0 ? (
                      <tr>
                        <td colSpan="6">No webhook events found.</td>
                      </tr>
                    ) : (
                      webhookEvents.map((event) => (
                        <tr key={event.eventId} className={event.status === 'failed' ? 'row-error' : ''}>
                          <td>{event.eventId}</td>
                          <td>{event.type}</td>
                          <td>{event.status}</td>
                          <td>{event.orderId || '—'}</td>
                          <td>{new Date(event.timestamp).toLocaleString()}</td>
                          <td>{event.errorMessage || event.resultMessage || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>

              <section className="monitoring-block">
                <h3>Order Payment Audit</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Type</th>
                      <th>Payment Status</th>
                      <th>Stripe Session</th>
                      <th>Payment Intent</th>
                      <th>Last Checked</th>
                      <th>Mismatch</th>
                      <th>Attention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentAuditItems.length === 0 ? (
                      <tr>
                        <td colSpan="8">No payment audit entries found.</td>
                      </tr>
                    ) : (
                      paymentAuditItems.map((item) => (
                        <tr key={`${item.orderId}-${item.orderType}`} className={item.requiresAttention ? 'row-error' : ''}>
                          <td>{item.orderId}</td>
                          <td>{item.orderType}</td>
                          <td>{item.paymentStatus}</td>
                          <td>{item.stripeSessionId || '—'}</td>
                          <td>{item.paymentIntentId || '—'}</td>
                          <td>{item.lastCheckedAt ? new Date(item.lastCheckedAt).toLocaleString() : '—'}</td>
                          <td>{item.mismatch ? 'Yes' : 'No'}</td>
                          <td>{item.requiresAttention ? item.attentionReasons.join(', ') : 'No'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </>
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
                          <span className="label">Images:</span> {order.images?.length || order.imagesCount || 0}
                        </span>
                        <span>
                          <span className="label">Total:</span> ${order.totalPrice?.toFixed(2) || '0.00'}
                        </span>
                        <span>
                          <span className="label">Deposit:</span> ${order.depositAmount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="admin-order-meta">
                        <span>
                          <span className="label">Status:</span> {order.status || 'submitted'}
                        </span>
                        <span>
                          <span className="label">Fulfillment:</span> {order.fulfillmentStatus || order.status || 'submitted'}
                        </span>
                        <span>
                          <span className="label">Payment:</span> {order.paymentStatus || 'pending'}
                        </span>
                      </div>
                      <div className="order-fulfillment-badges">
                        {(() => {
                          const badge = getProductionEligibilityBadge(order);
                          const job = productionJobsByOrder[order.orderId];
                          return (
                            <>
                              <span className={`status-badge ${badge.variant}`}>{badge.label}</span>
                              {job && (
                                <>
                                  <span className="status-badge info">Job {job.printJobId}</span>
                                  <span className={`status-badge ${job.status === 'stl_ready' || job.status === 'queued_for_batch' || job.status === 'assigned_to_printer' || job.status === 'printing' ? 'success' : 'warning'}`}>Job {job.status || 'unknown'}</span>
                                  <span className={`status-badge ${job.stlPath || job.stlFilename ? 'success' : 'warning'}`}>{job.stlPath || job.stlFilename ? 'STL Attached' : 'STL Missing'}</span>
                                  <span className={`status-badge ${job.assignedBatchId ? 'success' : 'warning'}`}>{job.assignedBatchId ? `Batch ${job.assignedBatchId}` : 'Batch not linked'}</span>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="admin-order-status-wrap">
                      <button
                        type="button"
                        className="admin-order-toggle-button"
                        onClick={() =>
                          setExpandedCustomOrders((prev) => ({
                            ...prev,
                            [order.orderId]: !prev[order.orderId],
                          }))
                        }
                      >
                        {expandedCustomOrders[order.orderId] ? 'Hide details' : 'Show details'}
                      </button>
                      <select
                        value={order.fulfillmentStatus || order.status || 'submitted'}
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
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => handleOpenFulfillmentPanel(order)}
                        disabled={order.isTest}
                        title={order.isTest ? 'Real fulfillment not available for test orders' : 'Open order fulfillment panel'}
                      >
                        Manage Fulfillment
                      </button>
                      {productionJobsByOrder[order.orderId] ? (
                        <button
                          type="button"
                          className="secondary-button small-button"
                          onClick={() => handleOpenPrintJob(productionJobsByOrder[order.orderId])}
                        >
                          Open Print Job
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => navigate(`/admin/work-order/${encodeURIComponent(order.orderId)}`)}
                      >
                        Generate Work Order
                      </button>
                      {(productionJobsByOrder?.[order.orderId]) ? (
                        <div className="production-job-summary">
                          <span>
                            Job: {productionJobsByOrder[order.orderId]?.printJobId || 'Unknown'}
                          </span>
                          <span>
                            Status: {productionJobsByOrder[order.orderId]?.status || 'Unknown'}
                          </span>
                          <span>
                            Batch: {productionJobsByOrder[order.orderId]?.assignedBatchId || 'None'}
                          </span>
                          <span>
                            STL: {(productionJobsByOrder[order.orderId]?.stlPath || productionJobsByOrder[order.orderId]?.stlFilename) ? 'Attached' : 'Missing'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {expandedCustomOrders[order.orderId] && (
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
                          <span className="label">Uploaded Images</span>
                          <div className="custom-order-image-grid">
                            {order.images.map((img, idx) => {
                              const imageUrl = normalizeCustomOrderImageUrl(img.path);
                              const resolvedUrl = imageUrl ? resolveImageUrl(imageUrl) : '';
                              return (
                                <div key={idx} className="custom-order-image-card">
                                  {resolvedUrl ? (
                                    <a href={resolvedUrl} target="_blank" rel="noreferrer">
                                      <img
                                        src={resolvedUrl}
                                        alt={img.originalName || `Uploaded image ${idx + 1}`}
                                        className="custom-order-image-thumb"
                                        onError={(e) => {
                                          e.currentTarget.src = '/images/hexforge-logo-removebg.png';
                                          e.currentTarget.alt = 'Missing image';
                                        }}
                                      />
                                    </a>
                                  ) : (
                                    <div className="custom-order-image-missing">Missing image</div>
                                  )}
                                  <div className="custom-order-image-meta">
                                    <div className="custom-order-image-name">
                                      {img.originalName || `Image ${idx + 1}`}
                                    </div>
                                    <div className="custom-order-image-details">
                                      Panel {img.panel || idx + 1} · {(img.size / 1024).toFixed(1)} KB
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="custom-order-actions-row">
                            <button
                              type="button"
                              className="secondary-button small-button"
                              onClick={() => window.open(`${API_BASE_URL}/admin/custom-orders/${encodeURIComponent(order.orderId)}/images.zip`, '_blank')}
                            >
                              Download ZIP
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

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

      {isFulfillmentPanelOpen && fulfillmentPanelOrder && (
        <div className="fulfillment-modal-backdrop" onClick={handleCloseFulfillmentPanel}>
          <div className="fulfillment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fulfillment-modal-header">
              <div>
                <h3>Fulfillment Detail</h3>
                <p>Order {fulfillmentPanelOrder.orderId}</p>
              </div>
              <div className="fulfillment-modal-header-actions">
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={refreshFulfillmentPanelJobs}
                  disabled={isLoadingFulfillmentPanel}
                >
                  Refresh jobs
                </button>
                <button type="button" className="secondary-button small-button" onClick={handleCloseFulfillmentPanel}>Close</button>
              </div>
            </div>

            {isLoadingFulfillmentPanel ? (
              <div className="fulfillment-modal-loading">Loading fulfillment details…</div>
            ) : (
              <>
                <div className="fulfillment-modal-section">
                  <h4>Order Summary</h4>
                  <div className="fulfillment-summary-grid">
                    <div><strong>Payment</strong><br />{fulfillmentPanelOrder?.paymentStatus || 'pending'}</div>
                    <div><strong>Fulfillment</strong><br />{fulfillmentPanelOrder?.fulfillmentStatus || fulfillmentPanelOrder?.status || 'submitted'}</div>
                    <div><strong>Images</strong><br />{Array.isArray(fulfillmentPanelOrder?.images) ? fulfillmentPanelOrder.images.length : fulfillmentPanelOrder?.imagesCount || 0}</div>
                    <div><strong>Total</strong><br />${Number(fulfillmentPanelOrder?.totalPrice || fulfillmentPanelOrder?.discountedTotal || 0).toFixed(2)}</div>
                    <div><strong>Deposit</strong><br />${Number(fulfillmentPanelOrder?.depositAmount || 0).toFixed(2)}</div>
                    <div><strong>Balance</strong><br />${Number(fulfillmentPanelOrder?.remainingBalance || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="fulfillment-modal-section">
                  <h4>Production Jobs</h4>
                  <div className="fulfillment-job-list">
                    {(fulfillmentPanelJobs || []).length === 0 ? (
                      <div className="empty-state">No production print jobs exist for this order yet.</div>
                    ) : (
                      (fulfillmentPanelJobs || []).filter(Boolean).map((job) => {
                        const isActive = isActiveFulfillmentJob(job);
                        return (
                          <button
                            type="button"
                            key={job.printJobId || 'unknown-job'}
                            className={`fulfillment-job-item ${selectedFulfillmentJobId === job.printJobId ? 'selected' : ''}`}
                            onClick={() => job?.printJobId && setSelectedFulfillmentJobId(job.printJobId)}
                          >
                            <div className="fulfillment-job-item-top">
                              <span>{job?.printJobId || 'Unknown'}</span>
                              <span className={`status-badge ${isActive ? 'success' : 'info'}`}>
                                {isActive ? 'Active run' : 'Prior run'}
                              </span>
                            </div>
                            <div>{job?.status || 'Unknown'}</div>
                            <div>{job?.assignedBatchId ? `Batch ${job.assignedBatchId}` : 'No batch'}</div>
                            <div>{job?.createdBy || 'created by admin'}</div>
                            <div>{job?.createdAt ? new Date(job.createdAt).toLocaleString() : 'No date'}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="fulfillment-modal-section">
                  <h4>Selected Job Details</h4>
                  {(() => {
                    if (!selectedFulfillmentJobId) {
                      return <div className="empty-state">Select a production job to manage fulfillment.</div>;
                    }
                    if (!selectedFulfillmentJob) {
                      return <div className="empty-state">Selected job not found.</div>;
                    }
                    return (
                      <>
                        <div className="fulfillment-summary-grid">
                          <div><strong>Status</strong><br />{selectedFulfillmentJob.status || 'Unknown'}</div>
                          <div><strong>STL</strong><br />{(selectedFulfillmentJob.stlPath || selectedFulfillmentJob.stlFilename) ? 'Attached' : 'Missing'}</div>
                          <div><strong>Batch</strong><br />{selectedFulfillmentJob.assignedBatchId || 'None'}</div>
                          <div><strong>Created</strong><br />{selectedFulfillmentJob.createdAt ? new Date(selectedFulfillmentJob.createdAt).toLocaleString() : 'Unknown'}</div>
                          <div><strong>Created By</strong><br />{selectedFulfillmentJob.createdBy || 'admin'}</div>
                        </div>
                        <div className="fulfillment-stl-input-grid">
                          <label>
                            STL Filename
                            <input
                              type="text"
                              value={fulfillmentStlFilename}
                              onChange={(e) => setFulfillmentStlFilename(e.target.value)}
                              placeholder="Enter STL filename"
                              className="admin-order-status-select"
                            />
                          </label>
                          <label>
                            STL Path
                            <input
                              type="text"
                              value={fulfillmentStlPath}
                              onChange={(e) => setFulfillmentStlPath(e.target.value)}
                              placeholder="Enter STL path"
                              className="admin-order-status-select"
                            />
                          </label>
                          <label>
                            STL Version
                            <input
                              type="text"
                              value={fulfillmentStlVersion}
                              onChange={(e) => setFulfillmentStlVersion(e.target.value)}
                              placeholder="Enter STL version"
                              className="admin-order-status-select"
                            />
                          </label>
                        </div>
                        <div className="fulfillment-modal-actions">
                          <button type="button" className="secondary-button small-button" onClick={() => handleOpenPrintJob(selectedFulfillmentJob)}>
                            Open Print Job
                          </button>
                          <button type="button" className="secondary-button small-button" onClick={handleApplyStlFromPanel}>
                            Apply STL
                          </button>
                          <button type="button" className="secondary-button small-button" onClick={handleCreateBatchFromPanel}>
                            Create Batch
                          </button>
                          <select
                            className="admin-order-status-select"
                            value={selectedFulfillmentBatchId}
                            onChange={(e) => setSelectedFulfillmentBatchId(e.target.value)}
                          >
                            <option value="">Select existing batch</option>
                            {(batches || []).map((batch) => (
                              <option key={batch.batchId} value={batch.batchId}>
                                {batch.batchId} • {batch.status || 'pending'}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="secondary-button small-button" onClick={handleAssignBatchFromPanel} disabled={!selectedFulfillmentBatchId}>
                            Assign Batch
                          </button>
                          <button type="button" className="secondary-button small-button danger-button" onClick={handleForceRerunFromPanel}>
                            Force Rerun Fulfillment
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {(!(fulfillmentPanelJobs || []).length) && !fulfillmentPanelOrder?.isTest && (
                  <div className="fulfillment-modal-section">
                    <button type="button" className="secondary-button small-button" onClick={() => handleStartFulfillmentInPanel(fulfillmentPanelOrder)}>
                      Start Fulfillment
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'production-queue' && (
        <div>
          <div className="admin-order-filter-row">
            <h2 className="section-header">PRODUCTION QUEUE</h2>
            <div className="admin-order-filter-controls">
              <label>
                Queue filter:
                <select
                  value={productionQueueFilter}
                  onChange={(e) => setProductionQueueFilter(e.target.value)}
                  className="admin-order-filter-select"
                >
                  <option value="all">All</option>
                  <option value="ready">Print Ready</option>
                  <option value="missing_images">Missing Images</option>
                  <option value="pending_deposit">Pending Deposit</option>
                  <option value="in_production">In Production</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label>
                Sort by:
                <select
                  value={productionQueueSort}
                  onChange={(e) => setProductionQueueSort(e.target.value)}
                  className="admin-order-filter-select"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="highest_total">Highest Total</option>
                  <option value="lowest_total">Lowest Total</option>
                </select>
              </label>
            </div>
          </div>
          <div className="admin-order-filter-summary">
            Showing {getProductionQueueItems.length} production queue item{getProductionQueueItems.length === 1 ? '' : 's'}
            {productionQueueFilter !== 'all' && (
              <span className="admin-order-filter-badge">
                {productionQueueFilter.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
          </div>

          {!getProductionQueueItems.length ? (
            <div className="empty-state">No production queue items match the current filter.</div>
          ) : (
            <div className="kanban-board">
              {boardColumns.map((column) => (
                <div
                  key={column.stage}
                  className={`kanban-column ${dragOverStage === column.stage ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleKanbanDragOver(e, column.stage)}
                  onDrop={(e) => handleKanbanDrop(e, column.stage)}
                  onDragLeave={handleKanbanDragLeave}
                >
                  <div className="kanban-column-header">
                    <div>{column.label}</div>
                    <div className="kanban-column-count">{column.orders.length}</div>
                  </div>
                  <div className="kanban-column-body">
                    {column.orders.length === 0 ? (
                      <div className="kanban-empty-state">No orders</div>
                    ) : (
                      column.orders.map((order) => {
                        const imageCount = Array.isArray(order.images) ? order.images.length : order.imagesCount || 0;
                        const ready = order.isPrintReady !== undefined ? order.isPrintReady : isCustomOrderPrintReady(order);
                        const notePreview = order.notes ? order.notes.slice(0, 120) : '';
                        return (
                          <div
                            key={order.orderId}
                            className={`kanban-card ${draggedOrderId === order.orderId ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleKanbanDragStart(e, order.orderId)}
                            onDragEnd={() => setDraggedOrderId(null)}
                          >
                            <div className="kanban-card-top">
                              <div>
                                <div className="kanban-card-title">{order.orderId}</div>
                                <div className="kanban-card-subtitle">{order.customer?.name || 'Unknown customer'}</div>
                              </div>
                              {ready && <div className="kanban-card-badge kanban-card-badge-ready">PRINT READY</div>}
                            </div>
                            <div className="kanban-card-meta">
                              <span>{order.productName || 'Unknown product'}</span>
                              <span>{order.productType || 'panel'}</span>
                              <span>{order.paymentStatus || 'pending'}</span>
                              <span>{order.fulfillmentStatus || order.status || 'submitted'}</span>
                              <span>${Number(order.totalPrice || order.discountedTotal || 0).toFixed(2)}</span>
                              <span>Deposit ${Number(order.depositAmount || 0).toFixed(2)}</span>
                              <span>Remain ${Number(order.remainingBalance || 0).toFixed(2)}</span>
                              <span>{imageCount} images</span>
                            </div>
                            {notePreview ? (
                              <div className="kanban-card-notes">{notePreview}{order.notes.length > 120 ? '…' : ''}</div>
                            ) : null}
                            <div className="kanban-card-actions">
                              <button
                                type="button"
                                className="secondary-button small-button"
                                onClick={() => handleCreatePrintJob(order)}
                              >
                                Create Print Job
                              </button>
                              <button
                                type="button"
                                className="secondary-button small-button"
                                onClick={() => navigate(`/admin/work-order/${encodeURIComponent(order.orderId)}`)}
                              >
                                Work Order
                              </button>
                              <button
                                type="button"
                                className="secondary-button small-button"
                                onClick={() => window.open(`${API_BASE_URL}/admin/custom-orders/${encodeURIComponent(order.orderId)}/images.zip`, '_blank')}
                              >
                                Download ZIP
                              </button>
                              <button
                                type="button"
                                className="secondary-button small-button"
                                onClick={() => handleCreatePrintJob(order)}
                              >
                                Create Print Job
                              </button>
                              <button
                                type="button"
                                className="secondary-button small-button"
                                onClick={() => setExpandedCustomOrders((prev) => ({
                                  ...prev,
                                  [order.orderId]: !prev[order.orderId],
                                }))}
                              >
                                {expandedCustomOrders[order.orderId] ? 'Hide details' : 'Details'}
                              </button>
                            </div>
                            {expandedCustomOrders[order.orderId] && (
                              <div className="kanban-card-expanded">
                                <div><strong>Notes:</strong> {order.notes || 'None'}</div>
                                <div><strong>Created:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown'}</div>
                                <div><strong>Shipping:</strong> {order.customer?.shippingAddress ? `${order.customer.shippingAddress.city}, ${order.customer.shippingAddress.state}` : 'Not provided'}</div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'print-jobs' && (
        <div>
          <div className="admin-order-filter-row">
            <h2 className="section-header">PRINT JOBS</h2>
            <div className="admin-order-filter-controls">
              <label>
                Status filter:
                <select
                  value={printJobStatusFilter}
                  onChange={(e) => setPrintJobStatusFilter(e.target.value)}
                  className="admin-order-filter-select"
                >
                  <option value="all">All</option>
                  <option value="queued_for_slicing">Queued for Slicing</option>
                  <option value="sliced">Sliced</option>
                  <option value="queued_for_batch">Queued for Batch</option>
                  <option value="assigned_to_printer">Assigned to Printer</option>
                  <option value="printing">Printing</option>
                  <option value="printed">Printed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
          </div>
          <div className="admin-order-filter-summary">
            Showing {printJobs.length} print job{printJobs.length === 1 ? '' : 's'}
            {printJobStatusFilter !== 'all' && (
              <span className="admin-order-filter-badge">
                {printJobStatusFilter.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
          </div>
          {isLoadingPrintJobs ? (
            <div className="empty-state">Loading print jobs…</div>
          ) : !printJobs.length ? (
            <div className="empty-state">No print jobs found.</div>
          ) : (
            <div className="print-jobs-grid">
              {printJobs.map((job) => {
                const stlEdits = stlEditsByJob[job.printJobId] || {};
                const stlFilenameValue = stlEdits.stlFilename !== undefined ? stlEdits.stlFilename : job.stlFilename || '';
                const stlPathValue = stlEdits.stlPath !== undefined ? stlEdits.stlPath : job.stlPath || '';
                const stlVersionValue = stlEdits.stlVersion !== undefined ? stlEdits.stlVersion : job.stlVersion || '';
                const generationNotesValue = stlEdits.generationNotes !== undefined ? stlEdits.generationNotes : job.generationNotes || '';

                return (
                  <div key={job.printJobId} className="print-job-card">
                    <div className="print-job-card-header">
                      <div>
                      <div className="print-job-title">{job.printJobId}</div>
                      <div className="print-job-subtitle">Order: {job.orderId}</div>
                    </div>
                    <div>
                      <div className={`print-job-status print-job-status-${job.status}`}>{job.status.replace(/_/g, ' ')}</div>
                      <select
                        value={job.status}
                        onChange={(e) => handleUpdatePrintJob(job.printJobId, { status: e.target.value })}
                        className="admin-order-status-select"
                        style={{ marginTop: '10px', minWidth: '180px' }}
                      >
                        <option value="queued_for_generation">Queued for Generation</option>
                        <option value="generating_stl">Generating STL</option>
                        <option value="stl_ready">STL Ready</option>
                        <option value="queued_for_slicing">Queued for Slicing</option>
                        <option value="sliced">Sliced</option>
                        <option value="queued_for_batch">Queued for Batch</option>
                        <option value="assigned_to_printer">Assigned to Printer</option>
                        <option value="printing">Printing</option>
                        <option value="printed">Printed</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="print-job-meta">
                    <div><strong>Printer:</strong> {job.printerProfile || 'TBD'}</div>
                    <div><strong>Material:</strong> {job.materialProfile || 'TBD'}</div>
                    <div><strong>Slicer:</strong> {job.slicerProfile || 'TBD'}</div>
                    <div><strong>Nozzle:</strong> {job.nozzle || 'TBD'}</div>
                    <div><strong>Layer Height:</strong> {job.layerHeight || 'TBD'}</div>
                    <div><strong>Generation Method:</strong> {job.generationMethod || 'Manual'}</div>
                    <div><strong>Lithophane Type:</strong> {job.lithophaneType || 'Custom'}</div>
                    <div><strong>Target WxHxD:</strong> {job.targetWidthMm || 'N/A'} x {job.targetHeightMm || 'N/A'} x {job.targetDepthMm || 'N/A'} mm</div>
                    <div><strong>Panel Count:</strong> {job.panelCount || 1}</div>
                    <div><strong>Infill:</strong> {job.infill || 'TBD'}%</div>
                    <div><strong>Walls:</strong> {job.wallCount || 'TBD'}</div>
                    <div><strong>Estimated Hours:</strong> {job.estimatedPrintHours || 0}</div>
                  </div>
                  <div className="print-job-links">
                    <div><strong>STL:</strong> {job.stlPath ? 'Attached' : 'Missing'}</div>
                    <div><strong>Project:</strong> {job.projectFilePath ? 'Attached' : 'Missing'}</div>
                    <div><strong>G-code:</strong> {job.gcodePath ? 'Attached' : 'Missing'}</div>
                  </div>
                  <div className="print-job-actions">
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleExportSlicerPacket(job.printJobId)}
                    >
                      Export Slicer Packet
                    </button>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleExportLithophanePacket(job.printJobId)}
                    >
                      Export Lithophane Packet
                    </button>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleCreateBatchFromPrintJob(job)}
                    >
                      New Batch from Job
                    </button>
                    {batches.length > 0 && (
                      <select
                        value={job.assignedBatchId || ''}
                        onChange={(e) => {
                          const batchId = e.target.value;
                          if (!batchId) return;
                          handleAssignPrintJobToBatch(job, batchId);
                        }}
                        className="admin-order-status-select"
                        style={{ minWidth: '170px' }}
                      >
                        <option value="">Assign to batch...</option>
                        {batches.map((batch) => (
                          <option key={batch.batchId} value={batch.batchId}>
                            {batch.batchId} • {batch.status || 'pending'}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleUpdateStlHandoff(job)}
                    >
                      Save STL Handoff
                    </button>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleUpdateStlHandoff(job, { status: 'stl_ready' })}
                    >
                      Mark STL Ready
                    </button>
                  </div>
                  <div className="print-job-links">
                    <div><strong>STL:</strong> {job.stlPath ? 'Attached' : 'Missing'}</div>
                    <div><strong>Filename:</strong> {job.stlFilename || 'Not set'}</div>
                    <div><strong>Version:</strong> {job.stlVersion || 'Not set'}</div>
                    <div><strong>Project:</strong> {job.projectFilePath ? 'Attached' : 'Missing'}</div>
                    <div><strong>G-code:</strong> {job.gcodePath ? 'Attached' : 'Missing'}</div>
                  </div>
                  <div className="print-job-meta">
                    <div><strong>Generation Notes</strong></div>
                    <textarea
                      className="form-input print-job-textarea"
                      value={generationNotesValue}
                      onChange={(e) => handleStlEditChange(job.printJobId, 'generationNotes', e.target.value)}
                      rows={3}
                    />
                    <div className="print-job-edit-row">
                      <input
                        className="form-input"
                        placeholder="STL Filename"
                        value={stlFilenameValue}
                        onChange={(e) => handleStlEditChange(job.printJobId, 'stlFilename', e.target.value)}
                      />
                      <input
                        className="form-input"
                        placeholder="STL Path"
                        value={stlPathValue}
                        onChange={(e) => handleStlEditChange(job.printJobId, 'stlPath', e.target.value)}
                      />
                      <input
                        className="form-input"
                        placeholder="STL Version"
                        value={stlVersionValue}
                        onChange={(e) => handleStlEditChange(job.printJobId, 'stlVersion', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="print-job-notes">
                    <strong>Notes</strong>
                    <p>{job.notes || 'No notes'}</p>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {activeTab === 'batches' && (
        <div>
          <div className="admin-order-filter-row">
            <h2 className="section-header">BATCHES</h2>
            <div className="admin-order-filter-controls">
              <label>
                Status filter:
                <select
                  value={batchStatusFilter}
                  onChange={(e) => setBatchStatusFilter(e.target.value)}
                  className="admin-order-filter-select"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="queued_for_batch">Queued for Batch</option>
                  <option value="assigned_to_printer">Assigned to Printer</option>
                  <option value="printing">Printing</option>
                  <option value="printed">Printed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
          </div>
          <div className="admin-order-filter-summary">
            Showing {batches.length} batch{batches.length === 1 ? '' : 'es'}
            {batchStatusFilter !== 'all' && (
              <span className="admin-order-filter-badge">
                {batchStatusFilter.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
          </div>
          {isLoadingBatches ? (
            <div className="empty-state">Loading batches…</div>
          ) : !batches.length ? (
            <div className="empty-state">No batches found.</div>
          ) : (
            <div className="print-jobs-grid">
              {batches.map((batch) => (
                <div key={batch.batchId} className="print-job-card">
                  <div className="print-job-card-header">
                    <div>
                      <div className="print-job-title">{batch.batchId}</div>
                      <div className="print-job-subtitle">Jobs: {batch.printJobIds?.length || 0}</div>
                    </div>
                    <div>
                      <div className={`print-job-status print-job-status-${batch.status}`}>
                        {batch.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="print-job-meta">
                    <div><strong>Printer:</strong> {batch.printerProfile || 'TBD'}</div>
                    <div><strong>Material:</strong> {batch.materialProfile || 'TBD'}</div>
                    <div><strong>Slicer:</strong> {batch.slicerProfile || 'TBD'}</div>
                    <div><strong>Nozzle:</strong> {batch.nozzle || 'TBD'}</div>
                    <div><strong>Layer Height:</strong> {batch.layerHeight || 'TBD'}</div>
                    <div><strong>Estimated Hours:</strong> {batch.totalEstimatedPrintHours || 0}</div>
                  </div>
                  <div className="print-job-links">
                    <div><strong>Project:</strong> {batch.projectFilePath ? 'Attached' : 'Missing'}</div>
                    <div><strong>G-code:</strong> {batch.gcodePath ? 'Attached' : 'Missing'}</div>
                  </div>
                  <div className="print-job-actions">
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => navigator.clipboard.writeText(batch.batchId).then(() => successToast('Batch ID copied.')).catch(() => errorToast('Failed to copy.'))}
                    >
                      Copy Batch ID
                    </button>
                  </div>
                  <div className="print-job-notes">
                    <strong>Notes</strong>
                    <p>{batch.notes || 'No notes'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'test-pipeline' && (
        <div className="test-pipeline-panel">
          <h2 className="section-header">TEST PIPELINE</h2>
          <div className={`test-pipeline-mode-banner ${testPipelineEffectiveEnabled ? 'enabled' : 'disabled'}`}>
            <div>
              <strong>{testPipelineEffectiveEnabled ? 'Test Pipeline Effectively Enabled' : 'Test Pipeline Effectively Disabled'}</strong>
              <div className="test-pipeline-mode-summary">
                <div>Deployment support: {testPipelineEnvAvailable ? 'Available' : 'Unavailable'}</div>
                <div>Runtime toggle: {testPipelineRuntimeEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Effective state: {testPipelineEffectiveEnabled ? 'Enabled' : 'Disabled'}</div>
                {testPipelineRuntimeExpired && (
                  <div className="test-pipeline-expired-warning">Runtime mode expired after {testPipelineAutoDisableAfterMinutes} minutes</div>
                )}
                {testPipelineRuntimeUpdatedAt && (
                  <div>Last updated: {new Date(testPipelineRuntimeUpdatedAt).toLocaleString()}</div>
                )}
                {testPipelineRuntimeUpdatedBy && (
                  <div>Updated by: {testPipelineRuntimeUpdatedBy}</div>
                )}
              </div>
            </div>
            <div className="test-pipeline-mode-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleToggleRuntimeStatus(!testPipelineRuntimeEnabled)}
                disabled={!testPipelineEnvAvailable || isLoadingTestPipelineStatus || isUpdatingRuntimeStatus}
              >
                {testPipelineRuntimeEnabled ? 'Disable Runtime Pipeline' : 'Enable Runtime Pipeline'}
              </button>
            </div>
            <span>
              {isLoadingTestPipelineStatus
                ? 'Loading test pipeline status…'
                : testPipelineModeMessage || (testPipelineEnvAvailable
                  ? `Runtime toggle is ${testPipelineRuntimeEnabled ? 'enabled' : 'disabled'}.`
                  : 'Deployment-level TEST_PIPELINE_MODE is disabled.')}
            </span>
          </div>
          <div className="admin-order-filter-controls">
            <label>
              Test Run ID:
              <input
                type="text"
                value={testPipelineTestRunId}
                onChange={(e) => setTestPipelineTestRunId(e.target.value)}
                placeholder="Optional test run ID"
              />
            </label>
            <label>
              Order ID:
              <input
                type="text"
                value={testPipelineOrderId}
                onChange={(e) => setTestPipelineOrderId(e.target.value)}
                placeholder="Optional order ID"
              />
            </label>
            <label>
              Print Job ID:
              <input
                type="text"
                value={testPipelinePrintJobId}
                onChange={(e) => setTestPipelinePrintJobId(e.target.value)}
                placeholder="Optional print job ID"
              />
            </label>
            <label>
              Batch ID:
              <input
                type="text"
                value={testPipelineBatchId}
                onChange={(e) => setTestPipelineBatchId(e.target.value)}
                placeholder="Optional batch ID"
              />
            </label>
          </div>

          <div className="test-pipeline-actions">
            <button type="button" className="primary-button" onClick={handleCreateTestOrder} disabled={testPipelineLoading || !testPipelineEnvAvailable || !testPipelineRuntimeEnabled}>
              Create Test Order
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleSimulateTestPayment}
              disabled={testPipelineLoading || !testPipelineEnvAvailable || !testPipelineRuntimeEnabled || !testPipelineOrderId}
            >
              Simulate Payment
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleCreateTestPrintJob}
              disabled={testPipelineLoading || !testPipelineEnvAvailable || !testPipelineRuntimeEnabled || !testPipelineOrderId}
            >
              Create Print Job
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleApplyTestStl}
              disabled={testPipelineLoading || !testPipelineEnvAvailable || !testPipelineRuntimeEnabled || !testPipelinePrintJobId}
            >
              Apply STL Handoff
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleCreateTestBatch}
              disabled={testPipelineLoading || !testPipelineEnvAvailable || !testPipelineRuntimeEnabled || !testPipelinePrintJobId}
            >
              Create Batch
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleAssignTestJob}
              disabled={testPipelineLoading || !testPipelineEnvAvailable || !testPipelineRuntimeEnabled || !testPipelinePrintJobId || !testPipelineBatchId}
            >
              Assign Job
            </button>
            <button type="button" className="primary-button" onClick={handleRunFullTestPipeline} disabled={testPipelineLoading || !testPipelineEnvAvailable || !testPipelineRuntimeEnabled}>
              Run Full Pipeline
            </button>
          </div>

          <div className="test-pipeline-actions" style={{ marginTop: '12px' }}>
            <button type="button" className="secondary-button" onClick={exportSlicerPacket} disabled={!testPipelineEnvAvailable || !testPipelineRuntimeEnabled || !testPipelinePrintJobId}>
              Export Slicer Packet
            </button>
            <button type="button" className="secondary-button" onClick={exportLithophanePacket} disabled={!testPipelineEnvAvailable || !testPipelineRuntimeEnabled || !testPipelinePrintJobId}>
              Export Lithophane Packet
            </button>
            <button type="button" className="secondary-button danger-button" onClick={handleCleanupTestData} disabled={testPipelineLoading || !testPipelineTestRunId}>
              Cleanup Test Data
            </button>
            <button type="button" className="secondary-button danger-button" onClick={handleForceCleanupAllTestData} disabled={testPipelineLoading}>
              Force Cleanup All Test Data
            </button>
          </div>

          <div className="test-pipeline-summary-row">
            <div><strong>Test Run ID:</strong> {testPipelineTestRunId || 'None'}</div>
            <div><strong>Order ID:</strong> {testPipelineOrderId || 'None'}</div>
            <div><strong>Print Job ID:</strong> {testPipelinePrintJobId || 'None'}</div>
            <div><strong>Batch ID:</strong> {testPipelineBatchId || 'None'}</div>
          </div>

          <div className="test-artifact-browser">
            <div className="test-artifact-header">
              <h3>Test Artifact Browser</h3>
              <div className="test-artifact-header-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={async () => {
                    setIsLoadingTestArtifacts(true);
                    try {
                      const artifactsRes = await axios.get(`${API_BASE_URL}/admin/test-artifacts`, {
                        params: { includeSuspected: true, limit: 200 },
                        withCredentials: true,
                      });
                      const body = artifactsRes.data || {};
                      setTestArtifacts({
                        confirmed: body.confirmed || { orders: [], printJobs: [], batches: [] },
                        suspected: body.suspected || { orders: [], printJobs: [], batches: [] },
                      });
                    } catch (err) {
                      console.warn('Failed to refresh test artifacts:', err.message || err);
                    } finally {
                      setIsLoadingTestArtifacts(false);
                    }
                  }}
                  disabled={isLoadingTestArtifacts}
                >
                  Refresh Artifacts
                </button>
                <button
                  type="button"
                  className="secondary-button danger-button"
                  onClick={handleCleanupTestData}
                  disabled={testPipelineLoading || !testPipelineTestRunId || (testArtifacts.confirmed.orders.length + testArtifacts.confirmed.printJobs.length + testArtifacts.confirmed.batches.length === 0)}
                  title={
                    !testPipelineTestRunId
                      ? 'Enter a Test Run ID before deleting confirmed artifacts'
                      : 'Delete confirmed test artifacts for this Test Run ID'
                  }
                >
                  Delete Confirmed Artifacts
                </button>
              </div>
            </div>
            <div className="test-artifact-summary">
              <div><strong>Confirmed test orders:</strong> {testArtifacts.confirmed.orders.length}</div>
              <div><strong>Confirmed test print jobs:</strong> {testArtifacts.confirmed.printJobs.length}</div>
              <div><strong>Confirmed test batches:</strong> {testArtifacts.confirmed.batches.length}</div>
              <div><strong>Suspected legacy orders:</strong> {testArtifacts.suspected.orders.length}</div>
              <div><strong>Suspected legacy print jobs:</strong> {testArtifacts.suspected.printJobs.length}</div>
              <div><strong>Suspected legacy batches:</strong> {testArtifacts.suspected.batches.length}</div>
            </div>
            {isLoadingTestArtifacts ? (
              <div className="empty-state">Loading test artifacts…</div>
            ) : (
              <>
                <div className="test-artifact-section">
                  <h4>Confirmed Test Records</h4>
                  <div className="artifact-list-grid">
                    <div className="artifact-list-card">
                      <div className="artifact-list-title">Orders</div>
                      <ul>
                        {testArtifacts.confirmed.orders.slice(0, 20).map((order) => (
                          <li key={order.orderId}>{order.orderId} {order.testRunId ? `(${order.testRunId})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="artifact-list-card">
                      <div className="artifact-list-title">Print Jobs</div>
                      <ul>
                        {testArtifacts.confirmed.printJobs.slice(0, 20).map((job) => (
                          <li key={job.printJobId}>{job.printJobId} {job.testRunId ? `(${job.testRunId})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="artifact-list-card">
                      <div className="artifact-list-title">Batches</div>
                      <ul>
                        {testArtifacts.confirmed.batches.slice(0, 20).map((batch) => (
                          <li key={batch.batchId}>{batch.batchId} {batch.testRunId ? `(${batch.testRunId})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="test-artifact-section">
                  <h4>Suspected Legacy Test Records</h4>
                  <div className="artifact-list-grid">
                    <div className="artifact-list-card">
                      <div className="artifact-list-title">Orders</div>
                      <ul>
                        {testArtifacts.suspected.orders.slice(0, 20).map((order) => (
                          <li key={order.orderId}>{order.orderId} {order.customer?.email ? `(${order.customer.email})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="artifact-list-card">
                      <div className="artifact-list-title">Print Jobs</div>
                      <ul>
                        {testArtifacts.suspected.printJobs.slice(0, 20).map((job) => (
                          <li key={job.printJobId}>{job.printJobId} {job.generationMethod ? `(${job.generationMethod})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="artifact-list-card">
                      <div className="artifact-list-title">Batches</div>
                      <ul>
                        {testArtifacts.suspected.batches.slice(0, 20).map((batch) => (
                          <li key={batch.batchId}>{batch.batchId}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="test-pipeline-steps-grid">
            {[
              { key: 'createOrder', label: 'Create Test Order' },
              { key: 'simulatePayment', label: 'Simulate Payment' },
              { key: 'createPrintJob', label: 'Create Print Job' },
              { key: 'applyStl', label: 'Apply STL Handoff' },
              { key: 'createBatch', label: 'Create Batch' },
              { key: 'assignJob', label: 'Assign Job' },
            ].map((step) => (
              <div key={step.key} className={`step-card step-${testPipelineStepStates[step.key]}`}>
                <div className="step-label">{step.label}</div>
                <div className="step-state">{testPipelineStepStates[step.key]}</div>
              </div>
            ))}
          </div>

          <div className="test-pipeline-status">
            <strong>Status:</strong> {testPipelineStatus || 'Idle'}
          </div>
          <div className="test-pipeline-log">
            <strong>Pipeline Log</strong>
            <pre>{testPipelineLog.join('\n')}</pre>
          </div>

          <div className={`test-pipeline-result ${isResultExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="result-header">
              <h3>Structured Result</h3>
              <div className="result-actions">
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => setIsResultExpanded((prev) => !prev)}
                  disabled={!testPipelineResult}
                >
                  {isResultExpanded ? 'Collapse' : 'Expand'}
                </button>
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => {
                    const text = formatJsonPreview(testPipelineResult);
                    navigator.clipboard.writeText(text).then(() => successToast('Result JSON copied.')).catch(() => errorToast('Failed to copy JSON.'));
                  }}
                  disabled={!testPipelineResult}
                >
                  Copy JSON
                </button>
              </div>
            </div>
            <pre className="result-json">
              {testPipelineResult ? formatJsonPreview(testPipelineResult) : 'No result data available yet.'}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'lithophane' && (
        <div>
          <div className="admin-order-filter-row">
            <h2 className="section-header">LITHOPHANE GENERATION</h2>
            <div className="admin-order-filter-controls">
              <label>
                Status filter:
                <select
                  value={lithophaneStatusFilter}
                  onChange={(e) => setLithophaneStatusFilter(e.target.value)}
                  className="admin-order-filter-select"
                >
                  <option value="all">All generation stages</option>
                  <option value="queued_for_generation">Queued for Generation</option>
                  <option value="generating_stl">Generating STL</option>
                  <option value="stl_ready">STL Ready</option>
                  <option value="queued_for_slicing">Queued for Slicing</option>
                </select>
              </label>
            </div>
          </div>
          <div className="admin-order-filter-summary">
            Showing {lithophaneJobs.length} print job{lithophaneJobs.length === 1 ? '' : 's'}
            {lithophaneStatusFilter !== 'all' && (
              <span className="admin-order-filter-badge">
                {lithophaneStatusFilter.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
          </div>
          {isLoadingLithophaneJobs ? (
            <div className="empty-state">Loading lithophane jobs…</div>
          ) : !lithophaneJobs.length ? (
            <div className="empty-state">No lithophane jobs found.</div>
          ) : (
            <div className="print-jobs-grid">
              {lithophaneJobs.map((job) => {
                const stlEdits = stlEditsByJob[job.printJobId] || {};
                const stlFilenameValue = stlEdits.stlFilename !== undefined ? stlEdits.stlFilename : job.stlFilename || '';
                const stlPathValue = stlEdits.stlPath !== undefined ? stlEdits.stlPath : job.stlPath || '';
                const stlVersionValue = stlEdits.stlVersion !== undefined ? stlEdits.stlVersion : job.stlVersion || '';
                const generationNotesValue = stlEdits.generationNotes !== undefined ? stlEdits.generationNotes : job.generationNotes || '';

                return (
                  <div key={job.printJobId} className="print-job-card">
                    <div className="print-job-card-header">
                      <div>
                        <div className="print-job-title">{job.printJobId}</div>
                        <div className="print-job-subtitle">Order: {job.orderId}</div>
                      </div>
                      <div>
                        <div className={`print-job-status print-job-status-${job.status}`}>{job.status.replace(/_/g, ' ')}</div>
                        <select
                          value={job.status}
                          onChange={(e) => handleUpdatePrintJob(job.printJobId, { status: e.target.value })}
                          className="admin-order-status-select"
                          style={{ marginTop: '10px', minWidth: '180px' }}
                        >
                          <option value="queued_for_generation">Queued for Generation</option>
                          <option value="generating_stl">Generating STL</option>
                          <option value="stl_ready">STL Ready</option>
                          <option value="queued_for_slicing">Queued for Slicing</option>
                          <option value="sliced">Sliced</option>
                          <option value="queued_for_batch">Queued for Batch</option>
                          <option value="assigned_to_printer">Assigned to Printer</option>
                          <option value="printing">Printing</option>
                          <option value="printed">Printed</option>
                          <option value="failed">Failed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="print-job-meta">
                      <div><strong>Printer:</strong> {job.printerProfile || 'TBD'}</div>
                      <div><strong>Material:</strong> {job.materialProfile || 'TBD'}</div>
                      <div><strong>Slicer:</strong> {job.slicerProfile || 'TBD'}</div>
                      <div><strong>Nozzle:</strong> {job.nozzle || 'TBD'}</div>
                      <div><strong>Layer Height:</strong> {job.layerHeight || 'TBD'}</div>
                      <div><strong>Generation Method:</strong> {job.generationMethod || 'Manual'}</div>
                      <div><strong>Lithophane Type:</strong> {job.lithophaneType || 'Custom'}</div>
                      <div><strong>Target WxHxD:</strong> {job.targetWidthMm || 'N/A'} x {job.targetHeightMm || 'N/A'} x {job.targetDepthMm || 'N/A'} mm</div>
                      <div><strong>Panel Count:</strong> {job.panelCount || 1}</div>
                    </div>
                    <div className="print-job-links">
                      <div><strong>STL:</strong> {job.stlPath ? 'Attached' : 'Missing'}</div>
                      <div><strong>Filename:</strong> {job.stlFilename || 'Not set'}</div>
                      <div><strong>Version:</strong> {job.stlVersion || 'Not set'}</div>
                      <div><strong>Project:</strong> {job.projectFilePath ? 'Attached' : 'Missing'}</div>
                      <div><strong>G-code:</strong> {job.gcodePath ? 'Attached' : 'Missing'}</div>
                    </div>
                    <div className="print-job-actions">
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => handleExportLithophanePacket(job.printJobId)}
                      >
                        Export Lithophane Packet
                      </button>
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => handleUpdateStlHandoff(job, { status: 'stl_ready' })}
                      >
                        Mark STL Ready
                      </button>
                    </div>
                    <div className="print-job-notes">
                      <strong>Generation Notes</strong>
                      <textarea
                        className="form-input print-job-textarea"
                        value={generationNotesValue}
                        onChange={(e) => handleStlEditChange(job.printJobId, 'generationNotes', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="print-job-edit-row">
                      <input
                        className="form-input"
                        placeholder="STL Filename"
                        value={stlFilenameValue}
                        onChange={(e) => handleStlEditChange(job.printJobId, 'stlFilename', e.target.value)}
                      />
                      <input
                        className="form-input"
                        placeholder="STL Path"
                        value={stlPathValue}
                        onChange={(e) => handleStlEditChange(job.printJobId, 'stlPath', e.target.value)}
                      />
                      <input
                        className="form-input"
                        placeholder="STL Version"
                        value={stlVersionValue}
                        onChange={(e) => handleStlEditChange(job.printJobId, 'stlVersion', e.target.value)}
                      />
                    </div>
                    <div className="print-job-notes">
                      <strong>Notes</strong>
                      <p>{job.notes || 'No notes'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
