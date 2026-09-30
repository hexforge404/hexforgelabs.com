import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/apiBase';

const PortfolioPageEditor = ({ onClose }) => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_BASE_URL}/admin/portfolio-page`, { withCredentials: true })
      .then(({ data }) => {
        if (active) setForm(data.config);
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.error || 'Could not load Portfolio page.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const sectionChange = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const guidePromptChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      guide: {
        ...current.guide,
        prompts: current.guide.prompts.map((prompt, i) =>
          i === index ? { ...prompt, [field]: value } : prompt
        ),
      },
    }));
  };

  const addGuidePrompt = () => {
    setForm((current) => ({
      ...current,
      guide: {
        ...current.guide,
        prompts: [
          ...current.guide.prompts,
          { label: '', response: '', includeEmail: false },
        ],
      },
    }));
  };

  const removeGuidePrompt = (index) => {
    setForm((current) => {
      if (current.guide.prompts.length <= 1) return current;

      return {
        ...current,
        guide: {
          ...current.guide,
          prompts: current.guide.prompts.filter((_, i) => i !== index),
        },
      };
    });
  };

  const portfolioSectionChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      ),
    }));
  };

  const addPortfolioSection = () => {
    setForm((current) => ({
      ...current,
      sections: [
        ...current.sections,
        { title: '', items: [''] },
      ],
    }));
  };

  const removePortfolioSection = (index) => {
    setForm((current) => {
      if (current.sections.length <= 1) return current;

      return {
        ...current,
        sections: current.sections.filter((_, i) => i !== index),
      };
    });
  };

  const sectionItemChange = (sectionIndex, itemIndex, value) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, j) =>
                j === itemIndex ? value : item
              ),
            }
          : section
      ),
    }));
  };

  const addSectionItem = (sectionIndex) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === sectionIndex
          ? { ...section, items: [...section.items, ''] }
          : section
      ),
    }));
  };

  const removeSectionItem = (sectionIndex, itemIndex) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, i) => {
        if (i !== sectionIndex || section.items.length <= 1) {
          return section;
        }

        return {
          ...section,
          items: section.items.filter((_, j) => j !== itemIndex),
        };
      }),
    }));
  };

  const projectSectionChange = (field, value) => {
    setForm((current) => ({
      ...current,
      projects: { ...current.projects, [field]: value },
    }));
  };

  const projectChange = (projectIndex, field, value) => {
    setForm((current) => ({
      ...current,
      projects: {
        ...current.projects,
        items: current.projects.items.map((project, index) =>
          index === projectIndex ? { ...project, [field]: value } : project
        ),
      },
    }));
  };

  const projectProvenanceChange = (projectIndex, field, value) => {
    setForm((current) => ({
      ...current,
      projects: {
        ...current.projects,
        items: current.projects.items.map((project, index) =>
          index === projectIndex
            ? { ...project, provenance: { ...project.provenance, [field]: value } }
            : project
        ),
      },
    }));
  };

  const projectScreenshotChange = (projectIndex, screenshotIndex, field, value) => {
    setForm((current) => ({
      ...current,
      projects: {
        ...current.projects,
        items: current.projects.items.map((project, index) =>
          index === projectIndex
            ? {
                ...project,
                screenshots: project.screenshots.map((screenshot, imageIndex) =>
                  imageIndex === screenshotIndex ? { ...screenshot, [field]: value } : screenshot
                ),
              }
            : project
        ),
      },
    }));
  };

  const addProject = () => projectSectionChange('items', [
    ...form.projects.items,
    {
      slug: '', title: '', category: '', summary: '', challenge: '',
      workPerformed: [], technologies: [], verification: [], screenshots: [],
      provenance: { label: '', baselineCommit: '', evidenceCommit: '' },
      caseStudyPath: '',
    },
  ]);

  const removeProject = (projectIndex) => projectSectionChange(
    'items',
    form.projects.items.filter((_, index) => index !== projectIndex)
  );

  const moveProject = (projectIndex, direction) => {
    const target = projectIndex + direction;
    if (target < 0 || target >= form.projects.items.length) return;
    const items = [...form.projects.items];
    [items[projectIndex], items[target]] = [items[target], items[projectIndex]];
    projectSectionChange('items', items);
  };

  const addProjectScreenshot = (projectIndex) => {
    const project = form.projects.items[projectIndex];
    projectChange(projectIndex, 'screenshots', [
      ...(project.screenshots || []),
      { src: '', alt: '', caption: '' },
    ]);
  };

  const removeProjectScreenshot = (projectIndex, screenshotIndex) => {
    const project = form.projects.items[projectIndex];
    projectChange(
      projectIndex,
      'screenshots',
      project.screenshots.filter((_, index) => index !== screenshotIndex)
    );
  };

  const lines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);

  const queueItemChange = (index, value) => {
    setForm((current) => ({
      ...current,
      currentQueue: {
        ...current.currentQueue,
        items: current.currentQueue.items.map((item, i) =>
          i === index ? value : item
        ),
      },
    }));
  };

  const addQueueItem = () => {
    setForm((current) => ({
      ...current,
      currentQueue: {
        ...current.currentQueue,
        items: [...current.currentQueue.items, ''],
      },
    }));
  };

  const removeQueueItem = (index) => {
    setForm((current) => {
      if (current.currentQueue.items.length <= 1) return current;

      return {
        ...current,
        currentQueue: {
          ...current.currentQueue,
          items: current.currentQueue.items.filter((_, i) => i !== index),
        },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const { data } = await axios.put(
        `${API_BASE_URL}/admin/portfolio-page`,
        form,
        { withCredentials: true }
      );

      setForm(data.config);
      setMessage('Portfolio page saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save Portfolio page.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="campaign-editor-form">
        <p>Loading Portfolio page…</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="campaign-editor-form">
        <p role="alert">{error || 'Could not load Portfolio page.'}</p>
        <button type="button" onClick={onClose}>
          Back to landing pages
        </button>
      </div>
    );
  }

  return (
    <div className="campaign-editor-form">
      <div className="campaign-editor-row">
        <div>
          <h3>Technical Portfolio</h3>
          <p>
            Specialized system page · Public URL:{' '}
            <a href="/portfolio" target="_blank" rel="noreferrer">
              /portfolio
            </a>
          </p>
        </div>

        <button type="button" onClick={onClose}>
          Back to landing pages
        </button>
      </div>

      <h3>Hero</h3>

      <label>
        Eyebrow
        <input
          value={form.hero.eyebrow || ''}
          onChange={(e) => sectionChange('hero', 'eyebrow', e.target.value)}
        />
      </label>

      <label>
        Headline
        <input
          value={form.hero.headline || ''}
          onChange={(e) => sectionChange('hero', 'headline', e.target.value)}
        />
      </label>

      <label>
        Subtitle
        <textarea
          rows="3"
          value={form.hero.subtitle || ''}
          onChange={(e) => sectionChange('hero', 'subtitle', e.target.value)}
        />
      </label>

      <label>
        Introduction
        <textarea
          rows="5"
          value={form.hero.body || ''}
          onChange={(e) => sectionChange('hero', 'body', e.target.value)}
        />
      </label>

      <h3>Portfolio Guide</h3>

      <label>
        Guide title
        <input
          value={form.guide.title || ''}
          onChange={(e) => sectionChange('guide', 'title', e.target.value)}
        />
      </label>

      <label>
        Guide introduction
        <textarea
          rows="3"
          value={form.guide.intro || ''}
          onChange={(e) => sectionChange('guide', 'intro', e.target.value)}
        />
      </label>

      {form.guide.prompts.map((prompt, index) => (
        <div className="campaign-editor-card" key={index}>
          <strong>Guide prompt {index + 1}</strong>

          <label>
            Button label
            <input
              value={prompt.label || ''}
              onChange={(e) =>
                guidePromptChange(index, 'label', e.target.value)
              }
            />
          </label>

          <label>
            Response
            <textarea
              rows="4"
              value={prompt.response || ''}
              onChange={(e) =>
                guidePromptChange(index, 'response', e.target.value)
              }
            />
          </label>

          <label className="campaign-checkbox">
            <input
              type="checkbox"
              checked={!!prompt.includeEmail}
              onChange={(e) =>
                guidePromptChange(index, 'includeEmail', e.target.checked)
              }
            />
            Append the site support email to this response
          </label>

          <button
            type="button"
            onClick={() => removeGuidePrompt(index)}
            disabled={form.guide.prompts.length <= 1}
          >
            Remove prompt
          </button>
        </div>
      ))}

      <button type="button" onClick={addGuidePrompt}>
        + Add guide prompt
      </button>

      <h3>Portfolio work sections</h3>

      {form.sections.map((section, sectionIndex) => (
        <div className="campaign-editor-card" key={sectionIndex}>
          <strong>Section {indexLabel(sectionIndex)}</strong>

          <label>
            Section title
            <input
              value={section.title || ''}
              onChange={(e) =>
                portfolioSectionChange(
                  sectionIndex,
                  'title',
                  e.target.value
                )
              }
            />
          </label>

          {section.items.map((item, itemIndex) => (
            <div className="campaign-editor-row" key={itemIndex}>
              <label>
                Item {itemIndex + 1}
                <textarea
                  rows="2"
                  value={item || ''}
                  onChange={(e) =>
                    sectionItemChange(
                      sectionIndex,
                      itemIndex,
                      e.target.value
                    )
                  }
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  removeSectionItem(sectionIndex, itemIndex)
                }
                disabled={section.items.length <= 1}
              >
                Remove item
              </button>
            </div>
          ))}

          <div className="campaign-editor-row">
            <button
              type="button"
              onClick={() => addSectionItem(sectionIndex)}
            >
              + Add item
            </button>

            <button
              type="button"
              onClick={() => removePortfolioSection(sectionIndex)}
              disabled={form.sections.length <= 1}
            >
              Remove section
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addPortfolioSection}>
        + Add work section
      </button>

      <h3>Featured Projects / Proof of Work</h3>
      <p className="hint-text">
        Verification statements are public-facing and should remain grounded in reviewed evidence.
      </p>

      <label>
        Section heading
        <input
          value={form.projects.heading || ''}
          onChange={(e) => projectSectionChange('heading', e.target.value)}
        />
      </label>

      <label>
        Section introduction
        <textarea
          rows="3"
          value={form.projects.intro || ''}
          onChange={(e) => projectSectionChange('intro', e.target.value)}
        />
      </label>

      {form.projects.items.map((project, projectIndex) => (
        <details className="campaign-editor-card portfolio-project-editor" key={project.slug || projectIndex}>
          <summary>
            Project {indexLabel(projectIndex)} · {project.title || 'Untitled project'}
          </summary>

          <div className="campaign-editor-row">
            <button type="button" onClick={() => moveProject(projectIndex, -1)} disabled={projectIndex === 0}>
              Move up
            </button>
            <button
              type="button"
              onClick={() => moveProject(projectIndex, 1)}
              disabled={projectIndex === form.projects.items.length - 1}
            >
              Move down
            </button>
            <button type="button" onClick={() => removeProject(projectIndex)}>Remove project</button>
          </div>

          <div className="campaign-editor-row">
            <label>
              Slug
              <input value={project.slug || ''} onChange={(e) => projectChange(projectIndex, 'slug', e.target.value)} />
            </label>
            <label>
              Category
              <input value={project.category || ''} onChange={(e) => projectChange(projectIndex, 'category', e.target.value)} />
            </label>
          </div>

          <label>
            Title
            <input value={project.title || ''} onChange={(e) => projectChange(projectIndex, 'title', e.target.value)} />
          </label>
          <label>
            Summary
            <textarea rows="4" value={project.summary || ''} onChange={(e) => projectChange(projectIndex, 'summary', e.target.value)} />
          </label>
          <label>
            Challenge
            <textarea rows="4" value={project.challenge || ''} onChange={(e) => projectChange(projectIndex, 'challenge', e.target.value)} />
          </label>
          <label>
            Work performed — one item per line
            <textarea
              rows="8"
              value={(project.workPerformed || []).join('\n')}
              onChange={(e) => projectChange(projectIndex, 'workPerformed', lines(e.target.value))}
            />
          </label>
          <label>
            Technologies — one per line
            <textarea
              rows="6"
              value={(project.technologies || []).join('\n')}
              onChange={(e) => projectChange(projectIndex, 'technologies', lines(e.target.value))}
            />
          </label>
          <label>
            Public verification — one evidence-backed statement per line
            <textarea
              rows="8"
              value={(project.verification || []).join('\n')}
              onChange={(e) => projectChange(projectIndex, 'verification', lines(e.target.value))}
            />
          </label>

          <h4>Screenshots</h4>
          {(project.screenshots || []).map((screenshot, screenshotIndex) => (
            <div className="campaign-editor-card" key={`${projectIndex}-${screenshotIndex}`}>
              <label>
                Public image path
                <input
                  value={screenshot.src || ''}
                  placeholder="/images/portfolio/project/image.png"
                  onChange={(e) => projectScreenshotChange(projectIndex, screenshotIndex, 'src', e.target.value)}
                />
              </label>
              <label>
                Alt text (required when an image path is present)
                <input
                  value={screenshot.alt || ''}
                  onChange={(e) => projectScreenshotChange(projectIndex, screenshotIndex, 'alt', e.target.value)}
                />
              </label>
              <label>
                Caption
                <textarea
                  rows="2"
                  value={screenshot.caption || ''}
                  onChange={(e) => projectScreenshotChange(projectIndex, screenshotIndex, 'caption', e.target.value)}
                />
              </label>
              <button type="button" onClick={() => removeProjectScreenshot(projectIndex, screenshotIndex)}>
                Remove screenshot
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addProjectScreenshot(projectIndex)}>+ Add screenshot</button>

          <h4>Evidence provenance</h4>
          <label>
            Provenance label
            <input
              value={project.provenance?.label || ''}
              onChange={(e) => projectProvenanceChange(projectIndex, 'label', e.target.value)}
            />
          </label>
          <div className="campaign-editor-row">
            <label>
              Baseline commit
              <input
                value={project.provenance?.baselineCommit || ''}
                onChange={(e) => projectProvenanceChange(projectIndex, 'baselineCommit', e.target.value)}
              />
            </label>
            <label>
              Evidence commit
              <input
                value={project.provenance?.evidenceCommit || ''}
                onChange={(e) => projectProvenanceChange(projectIndex, 'evidenceCommit', e.target.value)}
              />
            </label>
          </div>
          <label>
            Optional internal case-study path
            <input
              value={project.caseStudyPath || ''}
              placeholder="/portfolio/projects/project-slug"
              onChange={(e) => projectChange(projectIndex, 'caseStudyPath', e.target.value)}
            />
          </label>
        </details>
      ))}

      <button type="button" onClick={addProject}>+ Add proof-backed project</button>

      <h3>Current Project Queue</h3>

      <label>
        Section heading
        <input
          value={form.currentQueue.heading || ''}
          onChange={(e) =>
            sectionChange('currentQueue', 'heading', e.target.value)
          }
        />
      </label>

      {form.currentQueue.items.map((item, index) => (
        <div className="campaign-editor-row" key={index}>
          <label>
            Queue item {index + 1}
            <textarea
              rows="2"
              value={item || ''}
              onChange={(e) => queueItemChange(index, e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() => removeQueueItem(index)}
            disabled={form.currentQueue.items.length <= 1}
          >
            Remove item
          </button>
        </div>
      ))}

      <button type="button" onClick={addQueueItem}>
        + Add queue item
      </button>

      <h3>Contact</h3>

      <label>
        Section heading
        <input
          value={form.contact.heading || ''}
          onChange={(e) => sectionChange('contact', 'heading', e.target.value)}
        />
      </label>

      <label>
        Name
        <input
          value={form.contact.name || ''}
          onChange={(e) => sectionChange('contact', 'name', e.target.value)}
        />
      </label>

      <label>
        Location
        <input
          value={form.contact.location || ''}
          onChange={(e) => sectionChange('contact', 'location', e.target.value)}
        />
      </label>

      <label>
        Help button text
        <input
          value={form.contact.helpButtonText || ''}
          onChange={(e) =>
            sectionChange('contact', 'helpButtonText', e.target.value)
          }
        />
      </label>

      <p>
        Support email, Help-page destination, contact topics, and Portfolio
        submission routing are controlled by the site and are intentionally
        not editable here.
      </p>

      <h3>Contact Form</h3>

      <label>
        Contact form heading
        <input
          value={form.contactForm.heading || ''}
          onChange={(e) =>
            sectionChange('contactForm', 'heading', e.target.value)
          }
        />
      </label>

      <div className="campaign-editor-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Portfolio page'}
        </button>

        <a href="/portfolio" target="_blank" rel="noreferrer">
          Open public page
        </a>
      </div>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
};

const indexLabel = (index) => String(index + 1).padStart(2, '0');

export default PortfolioPageEditor;
