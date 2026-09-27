import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/apiBase';
import ImagePicker from './ImagePicker';

const MemorialPageEditor = ({ onClose }) => {
  const [form, setForm] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_BASE_URL}/admin/memorial-page`, { withCredentials: true })
      .then(({ data }) => {
        if (active) setForm(data.config);
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.error || 'Could not load Memorial page.');
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

  const arrayChange = (section, field, index, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: current[section][field].map((item, i) =>
          i === index ? value : item
        ),
      },
    }));
  };

  const packageChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      packages: {
        ...current.packages,
        items: current.packages.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const uploadHero = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setMessage('');

    const payload = new FormData();
    payload.append('image', file);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/admin/upload-image`,
        payload,
        { withCredentials: true }
      );

      sectionChange('hero', 'imageUrl', data.path);
      setMessage('Image uploaded. Save the page to use it.');
    } catch (err) {
      setError(err.response?.data?.error || 'Image upload failed.');
    }

    event.target.value = '';
  };

  const chooseHero = (url) => {
    sectionChange('hero', 'imageUrl', url);
    setPickerOpen(false);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const { data } = await axios.put(
        `${API_BASE_URL}/admin/memorial-page`,
        form,
        { withCredentials: true }
      );

      setForm(data.config);
      setMessage('Memorial page saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save Memorial page.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="campaign-editor-form">
        <p>Loading Memorial page…</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="campaign-editor-form">
        <p role="alert">{error || 'Could not load Memorial page.'}</p>
        <button type="button" onClick={onClose}>Back to landing pages</button>
      </div>
    );
  }

  return (
    <div className="campaign-editor-form">
      <div className="campaign-editor-row">
        <div>
          <h3>Memorial / Family Page</h3>
          <p>
            Specialized system page · Public URL:{' '}
            <a href="/memorial" target="_blank" rel="noreferrer">
              /memorial
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
        Introduction
        <textarea
          rows="5"
          value={form.hero.introPrimary || ''}
          onChange={(e) => sectionChange('hero', 'introPrimary', e.target.value)}
        />
      </label>

      <label>
        Secondary introduction
        <textarea
          rows="4"
          value={form.hero.introSecondary || ''}
          onChange={(e) => sectionChange('hero', 'introSecondary', e.target.value)}
        />
      </label>

      <div className="campaign-editor-row">
        <label>
          Primary button text
          <input
            value={form.hero.primaryCtaText || ''}
            onChange={(e) => sectionChange('hero', 'primaryCtaText', e.target.value)}
          />
        </label>

        <label>
          Primary button link
          <input
            value={form.hero.primaryCtaLink || ''}
            onChange={(e) => sectionChange('hero', 'primaryCtaLink', e.target.value)}
          />
        </label>
      </div>

      <div className="campaign-editor-row">
        <label>
          Secondary button text
          <input
            value={form.hero.secondaryCtaText || ''}
            onChange={(e) => sectionChange('hero', 'secondaryCtaText', e.target.value)}
          />
        </label>

        <label>
          Secondary button link
          <input
            value={form.hero.secondaryCtaLink || ''}
            onChange={(e) => sectionChange('hero', 'secondaryCtaLink', e.target.value)}
          />
        </label>
      </div>

      <label>
        Privacy note
        <textarea
          rows="3"
          value={form.hero.privacyText || ''}
          onChange={(e) => sectionChange('hero', 'privacyText', e.target.value)}
        />
      </label>

      <div className="campaign-editor-row">
        <label>
          Hero image path
          <input
            value={form.hero.imageUrl || ''}
            onChange={(e) => sectionChange('hero', 'imageUrl', e.target.value)}
          />
        </label>

        <button type="button" onClick={() => setPickerOpen(true)}>
          Choose hero image
        </button>

        <label>
          Upload hero image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={uploadHero}
          />
        </label>
      </div>

      <label>
        Hero image description
        <input
          value={form.hero.imageAlt || ''}
          onChange={(e) => sectionChange('hero', 'imageAlt', e.target.value)}
        />
      </label>

      <label>
        Hero image caption
        <input
          value={form.hero.imageCaption || ''}
          onChange={(e) => sectionChange('hero', 'imageCaption', e.target.value)}
        />
      </label>

      <h3>How it works</h3>

      <label>
        Section heading
        <input
          value={form.howItWorks.heading || ''}
          onChange={(e) => sectionChange('howItWorks', 'heading', e.target.value)}
        />
      </label>

      {form.howItWorks.steps.map((step, index) => (
        <label key={index}>
          Step {index + 1}
          <textarea
            rows="3"
            value={step || ''}
            onChange={(e) =>
              arrayChange('howItWorks', 'steps', index, e.target.value)
            }
          />
        </label>
      ))}

      <h3>Memorial keepsake options</h3>

      <label>
        Section heading
        <input
          value={form.packages.heading || ''}
          onChange={(e) => sectionChange('packages', 'heading', e.target.value)}
        />
      </label>

      {form.packages.items.map((item, index) => (
        <div className="campaign-editor-card" key={item.productSlug}>
          <strong>Package {String(index + 1).padStart(2, '0')}</strong>

          <p>
            Product identity: <code>{item.productSlug}</code>
            <br />
            This identity controls the product image and is intentionally not editable.
          </p>

          {item.availabilityOption && (
            <p>
              Availability requests for this package are generated by the site and are
              intentionally not editable here.
            </p>
          )}

          <label>
            Title
            <input
              value={item.title || ''}
              onChange={(e) => packageChange(index, 'title', e.target.value)}
            />
          </label>

          <label>
            Description
            <textarea
              rows="4"
              value={item.description || ''}
              onChange={(e) => packageChange(index, 'description', e.target.value)}
            />
          </label>

          <label>
            Best for
            <textarea
              rows="3"
              value={item.bestFor || ''}
              onChange={(e) => packageChange(index, 'bestFor', e.target.value)}
            />
          </label>

          <label>
            Image description
            <input
              value={item.imageAlt || ''}
              onChange={(e) => packageChange(index, 'imageAlt', e.target.value)}
            />
          </label>

          <div className="campaign-editor-row">
            <label>
              Button text
              <input
                value={item.buttonText || ''}
                onChange={(e) => packageChange(index, 'buttonText', e.target.value)}
              />
            </label>

            {!item.availabilityOption && (
              <label>
                Button link
                <input
                  value={item.buttonLink || ''}
                  onChange={(e) => packageChange(index, 'buttonLink', e.target.value)}
                />
              </label>
            )}
          </div>

          <label>
            Status label
            <input
              value={item.statusText || ''}
              onChange={(e) => packageChange(index, 'statusText', e.target.value)}
              placeholder="Example: Coming Soon"
            />
          </label>
        </div>
      ))}

      <h3>Photo guidance</h3>

      <label>
        Heading
        <input
          value={form.photoGuidance.heading || ''}
          onChange={(e) => sectionChange('photoGuidance', 'heading', e.target.value)}
        />
      </label>

      <label>
        Body
        <textarea
          rows="4"
          value={form.photoGuidance.body || ''}
          onChange={(e) => sectionChange('photoGuidance', 'body', e.target.value)}
        />
      </label>

      {form.photoGuidance.tips.map((tip, index) => (
        <label key={index}>
          Tip {index + 1}
          <textarea
            rows="2"
            value={tip || ''}
            onChange={(e) =>
              arrayChange('photoGuidance', 'tips', index, e.target.value)
            }
          />
        </label>
      ))}

      <h3>Optional keepsake message</h3>

      <label>
        Heading
        <input
          value={form.optionalKeepsake.heading || ''}
          onChange={(e) =>
            sectionChange('optionalKeepsake', 'heading', e.target.value)
          }
        />
      </label>

      <label>
        Body
        <textarea
          rows="4"
          value={form.optionalKeepsake.body || ''}
          onChange={(e) =>
            sectionChange('optionalKeepsake', 'body', e.target.value)
          }
        />
      </label>

      <h3>Contact</h3>

      <label>
        Heading
        <input
          value={form.contact.heading || ''}
          onChange={(e) => sectionChange('contact', 'heading', e.target.value)}
        />
      </label>

      <label>
        Text before support email
        <textarea
          rows="3"
          value={form.contact.bodyBeforeEmail || ''}
          onChange={(e) =>
            sectionChange('contact', 'bodyBeforeEmail', e.target.value)
          }
        />
      </label>

      <p>
        Support email is controlled by the site configuration and is intentionally
        not editable here.
      </p>

      <label>
        Text after support email
        <textarea
          rows="3"
          value={form.contact.bodyAfterEmail || ''}
          onChange={(e) =>
            sectionChange('contact', 'bodyAfterEmail', e.target.value)
          }
        />
      </label>

      <div className="campaign-editor-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Memorial page'}
        </button>

        <a href="/memorial" target="_blank" rel="noreferrer">
          Open public page
        </a>
      </div>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      {pickerOpen && (
        <ImagePicker
          title="Choose Memorial hero image"
          onSelect={chooseHero}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

export default MemorialPageEditor;
