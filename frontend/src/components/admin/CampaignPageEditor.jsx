import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../utils/apiBase';
import ImagePicker from './ImagePicker';
import './CampaignPageEditor.css';

const blank = () => ({
  slug: '', title: '', status: 'draft', eyebrow: '', headline: '', introduction: '',
  heroImage: '', heroAlt: '', heroConcept: false, primaryCtaText: 'Request a free photo check',
  primaryCtaLink: '/free-photo-check', sections: [], images: [], seo: { title: '', description: '' }
});
const templates = {
  'pet-memorial': { title: 'Pet Memorial Photo Lights', eyebrow: 'Honor a lifelong companion',
    headline: 'Keep their memory glowing', introduction: 'A custom photo light concept to celebrate the pets who are family. Explore the idea and send us a photo for a free review.' },
  'hunting-trophy-photos': { title: 'Hunting Trophy Photo Lights', eyebrow: 'Mark the moment',
    headline: 'Turn a hunting memory into a display', introduction: 'A personalized photo light concept for your favorite hunting moment. We can review your image and discuss a custom design.' },
  'fishing-trophy-photos': { title: 'Fishing Trophy Photo Lights', eyebrow: 'The catch, remembered',
    headline: 'Showcase the story behind the catch', introduction: 'A personalized photo light concept for fishing photographs and the memories around them. Send a photo to explore what is possible.' }
};

function CampaignPageEditor() {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(null);
  const [picker, setPicker] = useState(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const loadPages = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/admin/landing-pages`, { withCredentials: true });
      setPages(data.pages || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load pages.');
    }
  };
  useEffect(() => { loadPages(); }, []);
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const listChange = (key, index, field, value) => setForm(current => ({
    ...current, [key]: current[key].map((item, i) => i === index ? { ...item, [field]: value } : item)
  }));
  const chooseImage = url => {
    if (picker === 'hero') change('heroImage', url);
    else if (picker?.type === 'gallery') listChange('images', picker.index, 'url', url);
    setPicker(null);
  };
  const start = slug => {
    setMessage(''); setError(''); setPreview(false);
    setForm({ ...blank(), slug, ...(templates[slug] || {}), heroConcept: Boolean(templates[slug]) });
  };
  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const exists = pages.some(item => item.slug === form.slug);
      const endpoint = `${API_BASE_URL}/admin/landing-pages${exists ? `/${form.slug}` : ''}`;
      await axios({ method: exists ? 'put' : 'post', url: endpoint, data: form, withCredentials: true });
      await loadPages();
      setMessage(form.status === 'published' ? 'Page published.' : 'Draft saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save page.');
    } finally { setSaving(false); }
  };
  return (
    <section className="campaign-editor">
      <h2>Campaign landing pages</h2>
      <p>Build a draft, select images from the storefront gallery, preview it here, then publish when ready.</p>
      <div className="campaign-editor-list">
        <button type="button" onClick={() => start('')}>+ Blank page</button>
        {Object.keys(templates).filter(slug => !pages.some(page => page.slug === slug)).map(slug => (
          <button type="button" key={slug} onClick={() => start(slug)}>+ {templates[slug].title}</button>
        ))}
        {pages.map(page => (
          <button type="button" key={page.slug} onClick={() => { setForm(page); setError(''); setMessage(''); setPreview(false); }}>
            {page.title} · {page.status}
          </button>
        ))}
      </div>
      {form && (
        <div className="campaign-editor-form">
          <div className="campaign-editor-row">
            <label>Page URL slug<input value={form.slug} disabled={pages.some(page => page.slug === form.slug)} onChange={e => change('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="pet-memorial" /></label>
            <label>Status<select value={form.status} onChange={e => change('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          </div>
          <p>Public URL: /{form.slug || 'your-page'} {form.status === 'draft' && '· Only visible in this editor until published'}</p>
          <label>Internal title<input value={form.title || ''} onChange={e => change('title', e.target.value)} /></label>
          <label>Eyebrow<input value={form.eyebrow || ''} onChange={e => change('eyebrow', e.target.value)} /></label>
          <label>Headline<input value={form.headline || ''} onChange={e => change('headline', e.target.value)} /></label>
          <label>Introduction<textarea rows="4" value={form.introduction || ''} onChange={e => change('introduction', e.target.value)} /></label>
          <div className="campaign-editor-row">
            <label>Hero image path<input value={form.heroImage || ''} onChange={e => change('heroImage', e.target.value)} placeholder="/uploads/..." /></label>
            <button type="button" onClick={() => setPicker('hero')}>Choose hero image</button>
          </div>
          <label>Hero image description<input value={form.heroAlt || ''} onChange={e => change('heroAlt', e.target.value)} /></label>
          <label className="campaign-checkbox"><input type="checkbox" checked={!!form.heroConcept} onChange={e => change('heroConcept', e.target.checked)} /> Hero is a concept preview</label>
          <div className="campaign-editor-row">
            <label>Button text<input value={form.primaryCtaText || ''} onChange={e => change('primaryCtaText', e.target.value)} /></label>
            <label>Button link<input value={form.primaryCtaLink || ''} onChange={e => change('primaryCtaLink', e.target.value)} /></label>
          </div>
          <h3>Content sections</h3>
          {(form.sections || []).map((item, index) => (
            <div className="campaign-editor-card" key={index}>
              <label>Heading<input value={item.heading} onChange={e => listChange('sections', index, 'heading', e.target.value)} /></label>
              <label>Body<textarea rows="3" value={item.body} onChange={e => listChange('sections', index, 'body', e.target.value)} /></label>
              <button type="button" onClick={() => change('sections', form.sections.filter((_, i) => i !== index))}>Remove section</button>
            </div>
          ))}
          <button type="button" onClick={() => change('sections', [...(form.sections || []), { heading: '', body: '' }])}>+ Add section</button>
          <h3>Gallery</h3>
          {(form.images || []).map((item, index) => (
            <div className="campaign-editor-card" key={index}>
              <div className="campaign-editor-row">
                <label>Image path<input value={item.url} onChange={e => listChange('images', index, 'url', e.target.value)} /></label>
                <button type="button" onClick={() => setPicker({ type: 'gallery', index })}>Choose image</button>
              </div>
              <label>Description<input value={item.alt} onChange={e => listChange('images', index, 'alt', e.target.value)} /></label>
              <label>Caption<input value={item.caption} onChange={e => listChange('images', index, 'caption', e.target.value)} /></label>
              <label className="campaign-checkbox"><input type="checkbox" checked={!!item.concept} onChange={e => listChange('images', index, 'concept', e.target.checked)} /> Concept preview</label>
              <button type="button" onClick={() => change('images', form.images.filter((_, i) => i !== index))}>Remove image</button>
            </div>
          ))}
          <button type="button" onClick={() => change('images', [...(form.images || []), { url: '', alt: '', caption: '', concept: true }])}>+ Add image</button>
          <h3>Search listing</h3>
          <label>Page title<input value={form.seo?.title || ''} onChange={e => change('seo', { ...form.seo, title: e.target.value })} /></label>
          <label>Description<textarea rows="2" value={form.seo?.description || ''} onChange={e => change('seo', { ...form.seo, description: e.target.value })} /></label>
          <div className="campaign-editor-actions">
            <button type="button" onClick={() => setPreview(value => !value)}>{preview ? 'Hide' : 'Show'} draft preview</button>
            <button type="button" onClick={save} disabled={saving || !form.slug}>{saving ? 'Saving…' : 'Save page'}</button>
            {form.status === 'published' && pages.some(page => page.slug === form.slug) && <a href={`/${form.slug}`} target="_blank" rel="noreferrer">Open public page</a>}
          </div>
          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}
          {preview && <div className="campaign-editor-preview">
            <p>Draft preview {form.heroConcept && '· Concept preview'}</p>
            <h2>{form.headline}</h2><p>{form.introduction}</p>
            {form.heroImage && <img src={form.heroImage} alt={form.heroAlt || ''} />}
            {(form.sections || []).map((item, i) => <article key={i}><h3>{item.heading}</h3><p>{item.body}</p></article>)}
            {(form.images || []).map((item, i) => item.url && <figure key={i}><img src={item.url} alt={item.alt || ''} /><figcaption>{item.concept && 'Concept preview · '}{item.caption}</figcaption></figure>)}
          </div>}
        </div>
      )}
      {picker && <ImagePicker title="Choose storefront image" onSelect={chooseImage} onClose={() => setPicker(null)} />}
    </section>
  );
}
export default CampaignPageEditor;
