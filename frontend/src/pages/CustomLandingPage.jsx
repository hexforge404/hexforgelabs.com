import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './CustomLandingPage.css';

function CustomLandingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setPage(null);
    setError(false);
    fetch(`/api/landing-page/pages/${encodeURIComponent(slug)}`)
      .then(response => { if (!response.ok) throw new Error('Page unavailable'); return response.json(); })
      .then(data => { if (active) setPage(data.page); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!page) return undefined;
    const original = document.title;
    document.title = page.seo?.title || page.title;
    const meta = document.querySelector('meta[name="description"]');
    const previous = meta?.getAttribute('content');
    if (meta && page.seo?.description) meta.setAttribute('content', page.seo.description);
    return () => {
      document.title = original;
      if (meta && previous !== null) meta.setAttribute('content', previous);
    };
  }, [page]);

  if (error) return <main className="campaign-page campaign-message"><h1>Page unavailable</h1><Link to="/">Return home</Link></main>;
  if (!page) return <main className="campaign-page campaign-message" aria-live="polite">Loading page…</main>;

  return (
    <main className="campaign-page">
      <section className="campaign-hero">
        <div className="campaign-copy">
          {page.eyebrow && <p className="campaign-eyebrow">{page.eyebrow}</p>}
          <h1>{page.headline}</h1>
          <p>{page.introduction}</p>
          {page.primaryCtaText && page.primaryCtaLink && (
            <Link className="campaign-cta" to={page.primaryCtaLink}>{page.primaryCtaText}</Link>
          )}
        </div>
        {page.heroImage && (
          <figure className="campaign-visual">
            <img src={page.heroImage} alt={page.heroAlt || ''} />
            {page.heroConcept && (
              <figcaption>Concept preview</figcaption>
            )}
          </figure>
        )}
      </section>
      {page.sections?.filter(item => item.heading || item.body).length > 0 && (
        <div className="campaign-sections">
          {page.sections.filter(item => item.heading || item.body).map((item, index) => (
            <section className="campaign-section" key={index}>
              <h2>{item.heading}</h2><p>{item.body}</p>
            </section>
          ))}
        </div>
      )}
      {page.images?.length > 0 && (
        <section className="campaign-gallery">
          <h2>Examples and concepts</h2>
          <div className="campaign-grid">
            {page.images.map((item, index) => (
              <figure key={index}>
                <img src={item.url} alt={item.alt || item.caption || ''} loading="lazy" />
                <figcaption>{item.concept && <strong>Concept preview · </strong>}{item.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
export default CustomLandingPage;
