import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PortfolioPage from '../PortfolioPage';

jest.mock('../../components/ContactForm', () => () => <div>Contact form preserved</div>);

const renderPage = () => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <PortfolioPage />
  </MemoryRouter>
);

describe('PortfolioPage featured projects', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    document.title = 'Original site title';
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute('content', 'Original site description');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders all default projects, evidence qualifications, images, and general content', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/landing-page/portfolio'));

    expect(screen.getByRole('heading', { name: 'Website Platform' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homelab & Production Infrastructure' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evidence-Driven Capture & Content Pipeline' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Website Platform',
      'Homelab & Production Infrastructure',
      'Evidence-Driven Capture & Content Pipeline',
    ]);
    expect(screen.getByText(
      'Monitoring exposed webhook and payment-reconciliation state, including records requiring attention; the evidence does not establish complete payment reconciliation'
    )).toBeInTheDocument();
    expect(screen.getByText(/running at capture time/i)).toBeInTheDocument();
    expect(screen.getByText(/not successful restoration/i)).toBeInTheDocument();
    const websitePlatformScreenshots = [
      [
        'HexForge custom lithophane product page showing product imagery, pricing, photo guidance, and customer configuration controls',
        '/images/portfolio/website-platform/01-custom-product-intake.png',
      ],
      [
        'HexForge Admin Production Queue showing orders distributed across production workflow stages',
        '/images/portfolio/website-platform/02-production-queue.png',
      ],
      [
        'HexForge Admin Print Jobs view showing production records, technical fields, and job controls',
        '/images/portfolio/website-platform/03-print-jobs.png',
      ],
      [
        'HexForge Admin Monitoring view showing summary counts, webhook audit status, and redacted payment reconciliation records',
        '/images/portfolio/website-platform/04-monitoring-redacted.png',
      ],
      [
        'HexForge Admin Inventory view showing Notion-backed inventory records and quantities',
        '/images/portfolio/website-platform/05-notion-inventory.png',
      ],
      [
        'HexForge Technical Portfolio Admin editor showing structured Hero and Portfolio Guide controls',
        '/images/portfolio/website-platform/06-portfolio-editor.png',
      ],
    ];

    websitePlatformScreenshots.forEach(([alt, src]) => {
      expect(screen.getByAltText(alt)).toHaveAttribute('src', src);
    });
    expect(screen.getByAltText(/Sanitized HexForge production homelab architecture/i)).toHaveAttribute(
      'src',
      '/images/portfolio/homelab-infrastructure/infrastructure-overview.png'
    );
    expect(screen.getByAltText(/Evidence-driven capture-to-review architecture/i)).toHaveAttribute(
      'src',
      '/images/portfolio/content-pipeline/system-architecture.png'
    );
    expect(screen.getByAltText(/Ten-stage evidence and execution-control lifecycle/i)).toHaveAttribute(
      'src',
      '/images/portfolio/content-pipeline/evidence-control-lifecycle.png'
    );
    expect(screen.getByAltText(/Real charger-board repair workshop footage/i)).toHaveAttribute(
      'src',
      '/images/portfolio/content-pipeline/real-workload-proof.png'
    );
    expect(screen.getByAltText(/Verified V3.3 private-review result/i)).toHaveAttribute(
      'src',
      '/images/portfolio/content-pipeline/verified-private-review-result.png'
    );
    expect(screen.getByText(/V3.2 narration placement failed human review/i)).toBeInTheDocument();
    expect(screen.getByText(/Publication and deployment remained unauthorized/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Homelab & Production Infrastructure screenshots')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Computer & Device Troubleshooting' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current Project Queue' })).toBeInTheDocument();
    expect(screen.getByText('Phone charger module repair proof sheet')).toBeInTheDocument();
    expect(screen.getByText('3D printer calibration notes')).toBeInTheDocument();
    expect(screen.queryByText('Homelab summary write-up')).not.toBeInTheDocument();
    expect(screen.queryByText('Portfolio photos and screenshots')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View support options' })).toHaveAttribute('href', '/help');
    expect(screen.getByText('Contact form preserved')).toBeInTheDocument();

    const guideHeading = screen.getByRole('heading', { name: 'Portfolio at a glance' });
    const projectsHeading = screen.getByRole('heading', { name: 'Featured Projects / Proof of Work' });
    const capabilityHeading = screen.getByRole('heading', { name: 'Computer & Device Troubleshooting' });
    const queueHeading = screen.getByRole('heading', { name: 'Current Project Queue' });

    expect(guideHeading.compareDocumentPosition(projectsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(projectsHeading.compareDocumentPosition(capabilityHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(capabilityHeading.compareDocumentPosition(queueHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.title).toBe('Technical Portfolio | HexForge Labs');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Technical troubleshooting, repair, homelab, documentation, 3D printing, and hardware support work from HexForge Labs.'
    );

  });

  test('uses API-provided Portfolio metadata', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          seo: {
            title: 'Stored Portfolio Title',
            description: 'Stored Portfolio description.',
          },
        },
      }),
    });

    renderPage();

    await waitFor(() => expect(document.title).toBe('Stored Portfolio Title'));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Stored Portfolio description.'
    );
  });

  test('restores previous metadata on unmount', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    const { unmount } = renderPage();

    await waitFor(() => expect(document.title).toBe('Technical Portfolio | HexForge Labs'));
    unmount();

    expect(document.title).toBe('Original site title');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Original site description'
    );
  });

  test('keeps project detail expansion independent', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/landing-page/portfolio'));

    const summaries = screen.getAllByText('View project evidence and details');
    const firstDetails = summaries[0].closest('details');
    const secondDetails = summaries[1].closest('details');

    expect(firstDetails).not.toHaveAttribute('open');
    expect(secondDetails).not.toHaveAttribute('open');
    await userEvent.click(summaries[0]);
    expect(firstDetails).toHaveAttribute('open');
    expect(secondDetails).not.toHaveAttribute('open');
  });

  test('appends missing canonical projects after an older stored Website Platform project', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          projects: {
            items: [{
              slug: 'website-platform',
              category: 'Stored project',
              title: 'Stored Website Platform',
              summary: 'Stored Website content wins.',
              screenshots: [],
              technologies: [],
            }],
          },
        },
      }),
    });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Stored Website Platform' })).toBeInTheDocument();
    const projectHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(projectHeadings.map((heading) => heading.textContent)).toEqual([
      'Stored Website Platform',
      'Homelab & Production Infrastructure',
      'Evidence-Driven Capture & Content Pipeline',
    ]);
    expect(screen.getByText('Stored Website content wins.')).toBeInTheDocument();
  });

  test('renders API-provided project content', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          projects: {
            heading: 'Completed Projects',
            intro: 'Verified work',
            items: [{
              slug: 'homelab',
              category: 'Infrastructure',
              title: 'Homelab Platform',
              summary: 'A reusable project supplied by the API.',
              challenge: 'Keep services maintainable.',
              workPerformed: ['Documented services'],
              technologies: ['Linux'],
              verification: ['Configuration reviewed'],
              screenshots: [{ src: '/images/portfolio/homelab.png', alt: 'Homelab overview', caption: 'Overview' }],
              provenance: {},
              caseStudyPath: '',
            }],
          },
        },
      }),
    });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Homelab Platform' })).toBeInTheDocument();
    expect(screen.getByText('A reusable project supplied by the API.')).toBeInTheDocument();
    expect(screen.getByAltText('Homelab overview')).toBeInTheDocument();
  });

  test('falls back to all default projects when an older API config omits projects', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, config: { hero: { headline: 'Existing Portfolio' } } }),
    });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Existing Portfolio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Website Platform' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homelab & Production Infrastructure' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evidence-Driven Capture & Content Pipeline' })).toBeInTheDocument();
  });

  test('preserves a stored Project #3 edit, custom projects, and first duplicate while appending missing defaults', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          projects: {
            items: [
              {
                slug: 'custom-project',
                category: 'Custom',
                title: 'Stored Custom Project',
                summary: 'Custom content is preserved.',
                screenshots: [],
                technologies: [],
              },
              {
                slug: 'evidence-driven-content-pipeline',
                category: 'Stored category',
                title: 'Stored Content Pipeline',
                summary: 'Stored pipeline content wins.',
                screenshots: [],
                technologies: [],
              },
              {
                slug: 'evidence-driven-content-pipeline',
                category: 'Duplicate',
                title: 'Duplicate Content Pipeline',
                summary: 'This duplicate must be dropped.',
                screenshots: [],
                technologies: [],
              },
            ],
          },
        },
      }),
    });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Stored Content Pipeline' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Duplicate Content Pipeline' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Stored Custom Project',
      'Stored Content Pipeline',
      'Website Platform',
      'Homelab & Production Infrastructure',
    ]);
    expect(screen.getByText('Stored pipeline content wins.')).toBeInTheDocument();
  });
});
