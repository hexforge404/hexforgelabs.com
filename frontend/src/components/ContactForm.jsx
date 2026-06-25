import React, { useState } from 'react';
import { SUPPORT_EMAIL } from '../config';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  topic: '',
  message: '',
  website: ''
};

function ContactForm({ pageSource, topics, heading = 'Contact HexForge Labs' }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus(null);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setCopied(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!form.name.trim() || !form.message.trim() || (!form.email.trim() && !form.phone.trim())) {
      setStatus({
        type: 'error',
        text: 'Please add your name, a message, and either an email or phone number.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          pageSource
        })
      });

      if (!response.ok) {
        throw new Error('Contact submission failed');
      }

      setForm(initialForm);
      setStatus({
        type: 'success',
        text: "Thanks — your message was sent. I'll reply as soon as I can."
      });
    } catch (err) {
      setStatus({
        type: 'error',
        text: 'Something went wrong. You can still email rduff@hexforgelabs.com directly.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-form-header">
        <h2>{heading}</h2>
        <p>
          Send a message here without opening an email app. This is a direct contact form,
          not a client portal.
        </p>
      </div>

      <label className="contact-form-honeypot">
        Website
        <input
          type="text"
          name="website"
          tabIndex="-1"
          autoComplete="off"
          value={form.website}
          onChange={(event) => updateField('website', event.target.value)}
        />
      </label>

      <div className="contact-form-row">
        <label>
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </label>
      </div>

      <div className="contact-form-row">
        <label>
          Phone <span>optional</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </label>
        <label>
          Topic
          <select
            value={form.topic}
            onChange={(event) => updateField('topic', event.target.value)}
            required
          >
            <option value="">Choose a topic</option>
            {topics.map((topic) => (
              <option value={topic} key={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Message
        <textarea
          rows="5"
          value={form.message}
          onChange={(event) => updateField('message', event.target.value)}
          required
        />
      </label>

      {status && (
        <p className={`contact-form-status contact-form-status--${status.type}`}>
          {status.type === 'error' ? (
            <>
              Something went wrong. You can still email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> directly.
            </>
          ) : (
            status.text
          )}
        </p>
      )}

      <div className="contact-form-actions">
        <button className="public-info-button" type="submit" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send Message'}
        </button>
        <button className="public-info-link" type="button" onClick={copyEmail}>
          {copied ? 'Email Copied' : 'Copy Email'}
        </button>
        <a className="contact-form-fallback" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </div>
    </form>
  );
}

export default ContactForm;
