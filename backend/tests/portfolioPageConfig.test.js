const {
  LIMITS,
  buildPortfolioPageConfig,
  sanitizePortfolioPageConfig,
  sanitizeInternalPath,
  sanitizePublicAssetPath,
  sanitizeSlug,
} = require('../utils/portfolioPageConfig');
const { getDefaultPortfolioPageConfig } = require('../utils/defaultPortfolioPageConfig');

const project = (overrides = {}) => ({
  slug: 'Sample Project',
  title: 'Sample Project',
  category: 'Test',
  summary: 'Summary',
  challenge: 'Challenge',
  workPerformed: ['Work'],
  technologies: ['Node'],
  verification: ['Verified'],
  screenshots: [{ src: '/images/portfolio/sample.png', alt: 'Sample screen', caption: 'Caption' }],
  provenance: { label: 'Evidence', baselineCommit: 'abc1234', evidenceCommit: 'def5678' },
  caseStudyPath: '/portfolio/projects/sample-project',
  ...overrides,
});

describe('Portfolio project configuration', () => {
  test('defines Website Platform then Homelab as the canonical defaults', () => {
    expect(getDefaultPortfolioPageConfig().projects.items.map(({ slug }) => slug)).toEqual([
      'website-platform',
      'homelab-infrastructure',
    ]);
  });

  test('sanitizes every nested project field and normalizes slugs', () => {
    const config = sanitizePortfolioPageConfig({
      projects: { heading: ' Projects ', intro: ' Intro ', items: [project()] },
    });

    expect(config.projects.heading).toBe('Projects');
    expect(config.projects.items[0]).toEqual(expect.objectContaining({
      slug: 'sample-project',
      title: 'Sample Project',
      technologies: ['Node'],
      caseStudyPath: '/portfolio/projects/sample-project',
    }));
    expect(config.projects.items[0].screenshots[0]).toEqual({
      src: '/images/portfolio/sample.png',
      alt: 'Sample screen',
      caption: 'Caption',
    });
  });

  test('preserves both canonical projects through sanitization', () => {
    const defaults = getDefaultPortfolioPageConfig();
    const config = sanitizePortfolioPageConfig({ projects: defaults.projects });

    expect(config.projects.items.map(({ slug }) => slug)).toEqual([
      'website-platform',
      'homelab-infrastructure',
    ]);
  });

  test('safely discards malformed project entries during sanitization', () => {
    const config = sanitizePortfolioPageConfig({
      projects: { items: [null, {}, project({ slug: '', title: 'Missing slug' }), project()] },
    });

    expect(config.projects.items).toHaveLength(1);
    expect(config.projects.items[0].slug).toBe('sample-project');
  });

  test('enforces project and nested array bounds', () => {
    const config = sanitizePortfolioPageConfig({
      projects: {
        items: Array.from({ length: LIMITS.projects + 4 }, (_, index) => project({
          slug: `project-${index}`,
          title: `Project ${index}`,
          workPerformed: Array.from({ length: LIMITS.workPerformed + 3 }, (_, i) => `Work ${i}`),
          technologies: Array.from({ length: LIMITS.technologies + 3 }, (_, i) => `Tech ${i}`),
          verification: Array.from({ length: LIMITS.verification + 3 }, (_, i) => `Check ${i}`),
          screenshots: Array.from({ length: LIMITS.screenshots + 3 }, (_, i) => ({
            src: `/images/portfolio/screen-${i}.png`, alt: `Screen ${i}`,
          })),
        })),
      },
    });

    expect(config.projects.items).toHaveLength(LIMITS.projects);
    expect(config.projects.items[0].workPerformed).toHaveLength(LIMITS.workPerformed);
    expect(config.projects.items[0].technologies).toHaveLength(LIMITS.technologies);
    expect(config.projects.items[0].verification).toHaveLength(LIMITS.verification);
    expect(config.projects.items[0].screenshots).toHaveLength(LIMITS.screenshots);
  });

  test('rejects unsafe screenshot and case-study paths and screenshots without alt text', () => {
    expect(sanitizePublicAssetPath('https://example.com/image.png')).toBe('');
    expect(sanitizePublicAssetPath('/uploads/private.png')).toBe('');
    expect(sanitizePublicAssetPath('/images/../private.png')).toBe('');
    expect(sanitizePublicAssetPath('/images/%2e%2e/private.png')).toBe('');
    expect(sanitizeInternalPath('https://example.com/project')).toBe('');
    expect(sanitizeInternalPath('//example.com/project')).toBe('');
    expect(sanitizeInternalPath('/portfolio/../admin')).toBe('');
    expect(sanitizeSlug(' Unsafe / Project ')).toBe('unsafe-project');

    const config = sanitizePortfolioPageConfig({
      projects: {
        items: [project({
          screenshots: [
            { src: '/images/portfolio/good.png', alt: '', caption: 'Missing alt' },
            { src: 'file:///etc/passwd', alt: 'Unsafe' },
          ],
          caseStudyPath: 'https://example.com',
        })],
      },
    });

    expect(config.projects.items[0].screenshots).toEqual([]);
    expect(config.projects.items[0].caseStudyPath).toBe('');
  });

  test('uses complete project defaults for older configs without projects', () => {
    const merged = buildPortfolioPageConfig({ hero: { headline: 'Older Portfolio' } });
    expect(merged.hero.headline).toBe('Older Portfolio');
    expect(merged.projects.heading).toBe('Featured Projects / Proof of Work');
    expect(merged.projects.items.map(({ slug }) => slug)).toEqual([
      'website-platform',
      'homelab-infrastructure',
    ]);
  });

  test('uses complete defaults when a stored projects array is empty', () => {
    expect(buildPortfolioPageConfig({ projects: { items: [] } }).projects.items.map(({ slug }) => slug))
      .toEqual(['website-platform', 'homelab-infrastructure']);
  });

  test('preserves stored edits and order, retains custom projects, and appends missing defaults once', () => {
    const custom = project({ slug: 'custom-project', title: 'Custom Project' });
    const storedWebsite = project({ slug: 'website-platform', title: 'Stored Website Platform' });

    const merged = buildPortfolioPageConfig({
      projects: {
        heading: 'Project Archive',
        items: [custom, storedWebsite, project({ slug: 'website-platform', title: 'Duplicate' })],
      },
    });

    expect(merged.projects.heading).toBe('Project Archive');
    expect(merged.projects.items.map(({ slug }) => slug)).toEqual([
      'custom-project',
      'website-platform',
      'homelab-infrastructure',
    ]);
    expect(merged.projects.items[1].title).toBe('Stored Website Platform');
    expect(merged.projects.items.filter(({ slug }) => slug === 'website-platform')).toHaveLength(1);
    expect(merged.projects.items.filter(({ slug }) => slug === 'homelab-infrastructure')).toHaveLength(1);
  });
});
