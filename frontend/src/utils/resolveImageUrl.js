const DEFAULT_PLACEHOLDER = `${process.env.PUBLIC_URL || ''}/images/hexforge-logo-removebg.png`;

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

  if (raw.startsWith('/uploads/')) return raw;
  if (raw.startsWith('/images/')) return raw;

  if (raw.startsWith('uploads/')) return `/${raw}`;
  if (raw.startsWith('images/')) return `/${raw}`;

  return `/images/${raw}`;
};

export { resolveImageUrl, DEFAULT_PLACEHOLDER };
