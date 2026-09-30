const { getDefaultPortfolioPageConfig } = require('./defaultPortfolioPageConfig');

const LIMITS = Object.freeze({
  projects: 12,
  workPerformed: 20,
  technologies: 20,
  verification: 20,
  screenshots: 6,
});

const text = (value, max = 500) => String(value || '').trim().slice(0, max);

const sanitizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return value === 1;
};

const sanitizeSlug = (value) => text(value, 120)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')
  .slice(0, 80);

const hasUnsafePathSegment = (value) => {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.includes('\\') || decoded.split('/').some((segment) => segment === '..' || segment === '.');
  } catch (_err) {
    return true;
  }
};

const sanitizePublicAssetPath = (value) => {
  const path = text(value, 500);
  if (!path.startsWith('/images/') || path.includes('//') || hasUnsafePathSegment(path)) return '';
  return /^\/images\/[a-zA-Z0-9/_ .-]+$/.test(path) ? path : '';
};

const sanitizeInternalPath = (value) => {
  const path = text(value, 300);
  if (!path) return '';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('//') || hasUnsafePathSegment(path)) return '';
  return /^\/[a-zA-Z0-9/_-]+$/.test(path) ? path : '';
};

const sanitizeList = (value, maxItems, maxLength = 1000) => (
  Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => text(item, maxLength)).filter(Boolean)
    : []
);

const sanitizeProject = (project) => ({
  slug: sanitizeSlug(project?.slug),
  title: text(project?.title, 200),
  category: text(project?.category, 160),
  summary: text(project?.summary, 1200),
  challenge: text(project?.challenge, 2000),
  workPerformed: sanitizeList(project?.workPerformed, LIMITS.workPerformed),
  technologies: sanitizeList(project?.technologies, LIMITS.technologies, 120),
  verification: sanitizeList(project?.verification, LIMITS.verification),
  screenshots: (Array.isArray(project?.screenshots) ? project.screenshots : [])
    .slice(0, LIMITS.screenshots)
    .map((screenshot) => ({
      src: sanitizePublicAssetPath(screenshot?.src),
      alt: text(screenshot?.alt, 300),
      caption: text(screenshot?.caption, 500),
    }))
    .filter((screenshot) => screenshot.src && screenshot.alt),
  provenance: {
    label: text(project?.provenance?.label, 200),
    baselineCommit: text(project?.provenance?.baselineCommit, 80),
    evidenceCommit: text(project?.provenance?.evidenceCommit, 80),
  },
  caseStudyPath: sanitizeInternalPath(project?.caseStudyPath),
});

const sanitizePortfolioPageConfig = (body) => ({
  hero: {
    eyebrow: text(body?.hero?.eyebrow, 120),
    headline: text(body?.hero?.headline, 220),
    subtitle: text(body?.hero?.subtitle, 1000),
    body: text(body?.hero?.body, 3000),
  },
  guide: {
    title: text(body?.guide?.title, 160),
    intro: text(body?.guide?.intro, 1000),
    prompts: (Array.isArray(body?.guide?.prompts) ? body.guide.prompts : [])
      .slice(0, 12)
      .map((item) => ({
        label: text(item?.label, 180),
        response: text(item?.response, 2000),
        includeEmail: sanitizeBoolean(item?.includeEmail),
      }))
      .filter((item) => item.label || item.response),
  },
  sections: (Array.isArray(body?.sections) ? body.sections : [])
    .slice(0, 12)
    .map((section) => ({
      title: text(section?.title, 200),
      items: sanitizeList(section?.items, 20),
    }))
    .filter((section) => section.title || section.items.length),
  projects: {
    heading: text(body?.projects?.heading, 200),
    intro: text(body?.projects?.intro, 1200),
    items: (Array.isArray(body?.projects?.items) ? body.projects.items : [])
      .slice(0, LIMITS.projects)
      .map(sanitizeProject)
      .filter((project) => project.slug && project.title),
  },
  currentQueue: {
    heading: text(body?.currentQueue?.heading, 200),
    items: sanitizeList(body?.currentQueue?.items, 30),
  },
  contact: {
    heading: text(body?.contact?.heading, 200),
    name: text(body?.contact?.name, 160),
    location: text(body?.contact?.location, 200),
    helpButtonText: text(body?.contact?.helpButtonText, 120),
  },
  contactForm: { heading: text(body?.contactForm?.heading, 200) },
  seo: {
    title: text(body?.seo?.title, 180),
    description: text(body?.seo?.description, 400),
  },
});

const buildPortfolioPageConfig = (doc) => {
  const defaults = getDefaultPortfolioPageConfig();
  const data = doc || {};

  return {
    hero: { ...defaults.hero, ...(data.hero || {}) },
    guide: {
      ...defaults.guide,
      ...(data.guide || {}),
      prompts: Array.isArray(data.guide?.prompts) && data.guide.prompts.length
        ? data.guide.prompts
        : defaults.guide.prompts,
    },
    sections: Array.isArray(data.sections) && data.sections.length
      ? data.sections
      : defaults.sections,
    projects: {
      ...defaults.projects,
      ...(data.projects || {}),
      items: Array.isArray(data.projects?.items) && data.projects.items.length
        ? data.projects.items
        : defaults.projects.items,
    },
    currentQueue: {
      ...defaults.currentQueue,
      ...(data.currentQueue || {}),
      items: Array.isArray(data.currentQueue?.items) && data.currentQueue.items.length
        ? data.currentQueue.items
        : defaults.currentQueue.items,
    },
    contact: { ...defaults.contact, ...(data.contact || {}) },
    contactForm: { ...defaults.contactForm, ...(data.contactForm || {}) },
    seo: { ...defaults.seo, ...(data.seo || {}) },
  };
};

module.exports = {
  LIMITS,
  buildPortfolioPageConfig,
  sanitizeInternalPath,
  sanitizePortfolioPageConfig,
  sanitizePublicAssetPath,
  sanitizeSlug,
};
