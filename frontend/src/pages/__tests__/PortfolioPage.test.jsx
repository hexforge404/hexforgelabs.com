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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders both default projects, evidence qualifications, images, and general content', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/landing-page/portfolio'));

    expect(screen.getByRole('heading', { name: 'Website Platform' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homelab & Production Infrastructure' })).toBeInTheDocument();
    expect(screen.getByText('Existing tests were general frontend tests, not Portfolio-specific')).toBeInTheDocument();
    expect(screen.getByText(/running at capture time/i)).toBeInTheDocument();
    expect(screen.getByText(/not successful restoration/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Full Technical Portfolio page/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Sanitized HexForge production homelab architecture/i)).toHaveAttribute(
      'src',
      '/images/portfolio/homelab-infrastructure/infrastructure-overview.png'
    );
    expect(screen.queryByLabelText('Homelab & Production Infrastructure screenshots')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Computer & Device Troubleshooting' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current Project Queue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getByText('Contact form preserved')).toBeInTheDocument();

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

  test('appends Homelab after an older stored Website Platform project', async () => {
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

  test('falls back to both default projects when an older API config omits projects', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, config: { hero: { headline: 'Existing Portfolio' } } }),
    });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Existing Portfolio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Website Platform' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homelab & Production Infrastructure' })).toBeInTheDocument();
  });
});
