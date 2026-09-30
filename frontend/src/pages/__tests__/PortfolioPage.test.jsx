import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

  test('renders the default Website Platform project, evidence qualification, alt text, and general content', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/landing-page/portfolio'));

    expect(screen.getByRole('heading', { name: 'Website Platform' })).toBeInTheDocument();
    expect(screen.getByText('Existing tests were general frontend tests, not Portfolio-specific')).toBeInTheDocument();
    expect(screen.getByAltText(/Full Technical Portfolio page/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Computer & Device Troubleshooting' })).toBeInTheDocument();
    expect(screen.getByText('Contact form preserved')).toBeInTheDocument();

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

  test('falls back to the default project when an older API config omits projects', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, config: { hero: { headline: 'Existing Portfolio' } } }),
    });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Existing Portfolio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Website Platform' })).toBeInTheDocument();
  });
});
