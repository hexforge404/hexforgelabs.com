const DEFAULT_PLACEHOLDER = `${process.env.PUBLIC_URL || ''}/images/hexforge-logo-removebg.png`;

const getAssetBaseUrl = () => {
  const explicitBase = process.env.REACT_APP_IMAGE_BASE_URL || '';
  if (/^https?:\/\//i.test(explicitBase)) {
    return explicitBase.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV !== 'development') return '';

  const raw = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE || '';
  if (!/^https?:\/\//i.test(raw)) return '';
  const normalized = raw.replace(/\/api\/?$/i, '').replace(/\/+$/, '');

  if (typeof window === 'undefined') return normalized;

  try {
    const url = new URL(normalized);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = window.location.hostname;
    }
    return url.toString().replace(/\/+$/, '');
  } catch (error) {
    return normalized;
  }
};

const normalizePath = (value) => {
  if (!value) return '';
  return String(value).trim();
};

const resolveImageUrl = (value, options = {}) => {
  const placeholder = options.placeholder || DEFAULT_PLACEHOLDER;
  const raw = normalizePath(value);

  if (!raw) return placeholder;
  if (raw.startsWith('data:')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  if (raw.startsWith('/uploads/')) {
    const assetBaseUrl = getAssetBaseUrl();
    return assetBaseUrl ? `${assetBaseUrl}${raw}` : raw;
  }
  if (raw.startsWith('/images/')) return raw;

  if (raw.startsWith('uploads/')) {
    const assetBaseUrl = getAssetBaseUrl();
    return assetBaseUrl ? `${assetBaseUrl}/${raw}` : `/${raw}`;
  }
  if (raw.startsWith('images/')) return `/${raw}`;

  return `/images/${raw}`;
};

export { resolveImageUrl, DEFAULT_PLACEHOLDER };
