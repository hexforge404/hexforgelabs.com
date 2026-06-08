import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { SUPPORT_EMAIL } from '../config';
import {
  memorialGuideBlockedTopics,
  memorialGuideEntries,
  memorialGuideFallback,
  memorialGuideGreetings,
  memorialGuidePricingTerms
} from '../memorialGuideKnowledge';
import './MemorialGuide.css';

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findApprovedAnswer = (question) => {
  const normalizedQuestion = normalize(question);
  if (!normalizedQuestion) return null;

  if (memorialGuideBlockedTopics.some((topic) => normalizedQuestion.includes(topic))) {
    return null;
  }

  if (memorialGuidePricingTerms.some((term) => normalizedQuestion.includes(term))) {
    return memorialGuideEntries.find((entry) => entry.id === 'pricing') || null;
  }

  let bestMatch = null;
  let bestScore = 0;

  memorialGuideEntries.forEach((entry) => {
    const score = entry.keywords.reduce((total, keyword) => {
      if (!normalizedQuestion.includes(keyword)) return total;
      return total + (keyword.includes(' ') ? 3 : 1);
    }, 0);

    if (score > bestScore) {
      bestMatch = entry;
      bestScore = score;
    }
  });

  return bestScore > 0 ? bestMatch : null;
};

const MemorialGuide = ({ pageSource }) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const greeting = memorialGuideGreetings[pageSource];

  const suggestedQuestions = useMemo(() => {
    const ids =
      pageSource === 'funeralHomes'
        ? ['funeral-home-process', 'funeral-home-burden', 'info-packet', 'sample']
        : ['what-is-it', 'photo-guidance', 'privacy', 'family-set'];

    return ids
      .map((id) => memorialGuideEntries.find((entry) => entry.id === id))
      .filter(Boolean);
  }, [pageSource]);

  const buildMailto = (visitorQuestion = '') => {
    const body = [
      `Page source: ${pageSource}`,
      '',
      `Visitor question: ${visitorQuestion || 'Please enter your question here.'}`
    ].join('\n');

    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      'Memorial Keepsake Question'
    )}&body=${encodeURIComponent(body)}`;
  };

  const addQuestion = (nextQuestion) => {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion) return;

    const approvedEntry = findApprovedAnswer(trimmedQuestion);
    setMessages((previous) => [
      ...previous,
      { role: 'user', text: trimmedQuestion },
      {
        role: 'guide',
        text: approvedEntry?.answer || memorialGuideFallback,
        needsEscalation: !approvedEntry || approvedEntry.needsEscalation,
        visitorQuestion: trimmedQuestion
      }
    ]);
    setQuestion('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addQuestion(question);
  };

  return (
    <div className="memorial-guide">
      {open && (
        <section className="memorial-guide-panel" aria-label="Memorial Guide">
          <header className="memorial-guide-header">
            <div>
              <span className="memorial-guide-kicker">Campaign support</span>
              <h2>Memorial Guide</h2>
            </div>
            <button
              type="button"
              className="memorial-guide-close"
              onClick={() => setOpen(false)}
              aria-label="Close Memorial Guide"
            >
              ×
            </button>
          </header>

          <div className="memorial-guide-body">
            <div className="memorial-guide-conversation" aria-live="polite">
              <div className="memorial-guide-message memorial-guide-message--guide">
                {greeting}
              </div>

              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`}>
                  <div
                    className={`memorial-guide-message memorial-guide-message--${message.role}`}
                  >
                    {message.text}
                  </div>
                  {message.needsEscalation && (
                    <a
                      className="memorial-guide-email"
                      href={buildMailto(message.visitorQuestion)}
                    >
                      Email this question
                    </a>
                  )}
                </div>
              ))}
            </div>

            {messages.length === 0 && (
              <div className="memorial-guide-suggestions">
                {suggestedQuestions.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => addQuestion(entry.label)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <footer className="memorial-guide-footer">
            <form className="memorial-guide-form" onSubmit={handleSubmit}>
              <label htmlFor="memorial-guide-question">Ask a keepsake question</label>
              <div className="memorial-guide-input-row">
                <input
                  id="memorial-guide-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Type your question"
                  autoComplete="off"
                />
                <button type="submit" disabled={!question.trim()}>
                  Ask
                </button>
              </div>
            </form>

            <a className="memorial-guide-contact" href={buildMailto(question)}>
              Contact HexForge Labs
            </a>
          </footer>
        </section>
      )}

      <button
        type="button"
        className="memorial-guide-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Open Memorial Guide"
      >
        <span className="memorial-guide-icon" aria-hidden="true">✦</span>
        <span>Memorial Guide</span>
      </button>
    </div>
  );
};

MemorialGuide.propTypes = {
  pageSource: PropTypes.oneOf(['funeralHomes', 'memorial']).isRequired
};

export default MemorialGuide;
