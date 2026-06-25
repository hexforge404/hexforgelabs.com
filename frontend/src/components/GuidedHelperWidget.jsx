import React, { useState } from 'react';
import { SUPPORT_EMAIL } from '../config';

function GuidedHelperWidget({ title, intro, prompts }) {
  const [activePrompt, setActivePrompt] = useState(prompts[0]);

  return (
    <aside className="guided-helper" aria-label={title}>
      <div className="guided-helper-header">
        <p className="public-info-eyebrow">{title}</p>
        <h2>{title}</h2>
        <p>{intro}</p>
      </div>

      <div className="guided-helper-buttons">
        {prompts.map((prompt) => (
          <button
            type="button"
            key={prompt.label}
            className={
              'guided-helper-button' +
              (activePrompt?.label === prompt.label ? ' guided-helper-button--active' : '')
            }
            onClick={() => setActivePrompt(prompt)}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {activePrompt && (
        <div className="guided-helper-response">
          <p>
            {activePrompt.response}
            {activePrompt.includeEmail && (
              <>
                {' '}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </>
            )}
          </p>
        </div>
      )}
    </aside>
  );
}

export default GuidedHelperWidget;
