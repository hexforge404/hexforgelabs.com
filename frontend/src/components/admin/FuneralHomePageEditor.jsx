import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/apiBase';
import ImagePicker from './ImagePicker';

const FuneralHomePageEditor = ({ onClose }) => {
  const [form, setForm] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_BASE_URL}/admin/funeral-home-page`, { withCredentials: true })
      .then(({ data }) => {
        if (active) setForm(data.config);
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.error || 'Could not load funeral home page.');
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

  const cardChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      familyReceives: {
        ...current.familyReceives,
        cards: current.familyReceives.cards.map((card, i) =>
          i === index ? { ...card, [field]: value } : card
        ),
      },
    }));
  };

  const stepChange = (index, value) => {
    setForm((current) => ({
      ...current,
      referralSteps: {
        ...current.referralSteps,
        steps: current.referralSteps.steps.map((step, i) =>
          i === index ? value : step
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
        `${API_BASE_URL}/admin/funeral-home-page`,
        form,
        { withCredentials: true }
      );

      setForm(data.config);
      setMessage('Funeral Home page saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save funeral home page.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="campaign-editor-form"><p>Loading Funeral Home page…</p></div>;
  }

  if (!form) {
    return (
      <div className="campaign-editor-form">
        <p role="alert">{error || 'Could not load Funeral Home page.'}</p>
        <button type="button" onClick={onClose}>Back to landing pages</button>
      </div>
    );
  }

  return (
    <div className="campaign-editor-form">
      <div className="campaign-editor-row">
        <div>
          <h3>Funeral Home Director</h3>
          <p>
            Specialized system page · Public URL:{' '}
            <a href="/funeral-homes" target="_blank" rel="noreferrer">
              /funeral-homes
            </a>
          </p>
        </div>
        <button type="button" onClick={onClose}>Back to landing pages</button>
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
          Email subject
          <input
            value={form.hero.primaryCtaSubject || ''}
            onChange={(e) => sectionChange('hero', 'primaryCtaSubject', e.target.value)}
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

      <div className="campaign-editor-row">
        <label>
          Image caption title
          <input
            value={form.hero.imageCaptionTitle || ''}
            onChange={(e) => sectionChange('hero', 'imageCaptionTitle', e.target.value)}
          />
        </label>

        <label>
          Image caption text
          <input
            value={form.hero.imageCaptionText || ''}
            onChange={(e) => sectionChange('hero', 'imageCaptionText', e.target.value)}
          />
        </label>
      </div>

      <h3>Referral introduction</h3>
      <label>
        Heading
        <input
          value={form.referral.heading || ''}
          onChange={(e) => sectionChange('referral', 'heading', e.target.value)}
        />
      </label>

      <label>
        Body
        <textarea
          rows="5"
          value={form.referral.body || ''}
          onChange={(e) => sectionChange('referral', 'body', e.target.value)}
        />
      </label>

      <label>
        Callout
        <textarea
          rows="3"
          value={form.referral.callout || ''}
          onChange={(e) => sectionChange('referral', 'callout', e.target.value)}
        />
      </label>

      <h3>{form.familyReceives.heading || 'What families receive'}</h3>
      <label>
        Section heading
        <input
          value={form.familyReceives.heading || ''}
          onChange={(e) => sectionChange('familyReceives', 'heading', e.target.value)}
        />
      </label>

      {form.familyReceives.cards.map((card, index) => (
        <div className="campaign-editor-card" key={index}>
          <strong>Card {String(index + 1).padStart(2, '0')}</strong>
          <label>
            Title
            <input
              value={card.title || ''}
              onChange={(e) => cardChange(index, 'title', e.target.value)}
            />
          </label>
          <label>
            Body
            <textarea
              rows="3"
              value={card.body || ''}
              onChange={(e) => cardChange(index, 'body', e.target.value)}
            />
          </label>
        </div>
      ))}

      <label>
        Privacy note
        <textarea
          rows="3"
          value={form.familyReceives.privacyText || ''}
          onChange={(e) => sectionChange('familyReceives', 'privacyText', e.target.value)}
        />
      </label>

      <h3>Referral steps</h3>
      <label>
        Section heading
        <input
          value={form.referralSteps.heading || ''}
          onChange={(e) => sectionChange('referralSteps', 'heading', e.target.value)}
        />
      </label>

      {form.referralSteps.steps.map((step, index) => (
        <label key={index}>
          Step {index + 1}
          <textarea
            rows="3"
            value={step || ''}
            onChange={(e) => stepChange(index, e.target.value)}
          />
        </label>
      ))}

      <h3>Director sample</h3>
      <label>
        Heading
        <input
          value={form.directorSample.heading || ''}
          onChange={(e) => sectionChange('directorSample', 'heading', e.target.value)}
        />
      </label>

      <label>
        Body
        <textarea
          rows="4"
          value={form.directorSample.body || ''}
          onChange={(e) => sectionChange('directorSample', 'body', e.target.value)}
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
          onChange={(e) => sectionChange('contact', 'bodyBeforeEmail', e.target.value)}
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
          onChange={(e) => sectionChange('contact', 'bodyAfterEmail', e.target.value)}
        />
      </label>

      <h3>Search listing</h3>
      <label>
        Page title
        <input
          value={form.seo?.title || ''}
          onChange={(e) => sectionChange('seo', 'title', e.target.value)}
        />
      </label>

      <label>
        Meta description
        <textarea
          rows="3"
          value={form.seo?.description || ''}
          onChange={(e) => sectionChange('seo', 'description', e.target.value)}
        />
      </label>

      <div className="campaign-editor-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Funeral Home page'}
        </button>
        <a href="/funeral-homes" target="_blank" rel="noreferrer">
          Open public page
        </a>
      </div>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      {pickerOpen && (
        <ImagePicker
          title="Choose Funeral Home hero image"
          onSelect={chooseHero}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

export default FuneralHomePageEditor;
