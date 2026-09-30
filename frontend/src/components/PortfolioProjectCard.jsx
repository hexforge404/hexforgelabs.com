import React from 'react';
import { Link } from 'react-router-dom';

const ProjectList = ({ title, items, className = '' }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className={className}>
      <h4>{title}</h4>
      <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
    </section>
  );
};

function PortfolioProjectCard({ project }) {
  const screenshots = Array.isArray(project.screenshots) ? project.screenshots : [];
  const galleryScreenshots = screenshots.slice(1);
  const technologies = Array.isArray(project.technologies) ? project.technologies : [];

  return (
    <article className="portfolio-project-card">
      <header className="portfolio-project-header">
        <p className="public-info-eyebrow">{project.category}</p>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
      </header>

      {screenshots[0] && (
        <a
          className="portfolio-project-primary-image"
          href={screenshots[0].src}
          target="_blank"
          rel="noreferrer"
          aria-label={`View full-size image: ${screenshots[0].alt}`}
        >
          <img loading="lazy" src={screenshots[0].src} alt={screenshots[0].alt} />
        </a>
      )}

      <div className="portfolio-project-technologies" aria-label={`${project.title} technologies`}>
        {technologies.map((technology) => <span key={technology}>{technology}</span>)}
      </div>

      <details className="portfolio-project-details">
        <summary>View project evidence and details</summary>
        <div className="portfolio-project-detail-grid">
          {project.challenge && (
            <section>
              <h4>Challenge</h4>
              <p>{project.challenge}</p>
            </section>
          )}
          <ProjectList title="Work performed" items={project.workPerformed} />
          <ProjectList title="Verification" items={project.verification} className="portfolio-project-verification" />
        </div>

        {galleryScreenshots.length > 0 && (
          <div className="portfolio-project-gallery" aria-label={`${project.title} screenshots`}>
            {galleryScreenshots.map((screenshot) => (
              <figure key={screenshot.src}>
                <a href={screenshot.src} target="_blank" rel="noreferrer">
                  <img loading="lazy" src={screenshot.src} alt={screenshot.alt} />
                </a>
                {screenshot.caption && <figcaption>{screenshot.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {project.provenance?.label && (
          <aside className="portfolio-project-provenance" aria-label="Project provenance">
            <span>{project.provenance.label}</span>
            {project.provenance.baselineCommit && (
              <span>implementation {project.provenance.baselineCommit}</span>
            )}
            {project.provenance.evidenceCommit && (
              <span>evidence {project.provenance.evidenceCommit}</span>
            )}
          </aside>
        )}

        {project.caseStudyPath && (
          <Link className="public-info-link" to={project.caseStudyPath}>View detailed case study</Link>
        )}
      </details>
    </article>
  );
}

export default PortfolioProjectCard;
