const {
  LIMITS,
  buildPortfolioPageConfig,
  sanitizePortfolioPageConfig,
  sanitizeInternalPath,
  sanitizePublicAssetPath,
  sanitizeSlug,
} = require('../utils/portfolioPageConfig');

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

  test('uses Website Platform defaults for older configs without projects', () => {
    const merged = buildPortfolioPageConfig({ hero: { headline: 'Older Portfolio' } });
    expect(merged.hero.headline).toBe('Older Portfolio');
    expect(merged.projects.heading).toBe('Featured Projects / Proof of Work');
    expect(merged.projects.items[0].slug).toBe('website-platform');
  });

  test('uses defaults when a stored projects array is empty and stored projects when populated', () => {
    expect(buildPortfolioPageConfig({ projects: { items: [] } }).projects.items[0].slug)
      .toBe('website-platform');

    const merged = buildPortfolioPageConfig({
      projects: { heading: 'Project Archive', items: [project({ slug: 'custom-project' })] },
    });
    expect(merged.projects.heading).toBe('Project Archive');
    expect(merged.projects.items[0].slug).toBe('custom-project');
  });
});
