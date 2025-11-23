// frontend/src/hooks/useAssistantChat.js
import { useState, useCallback } from 'react';
import axios from 'axios';

let idCounter = 0;
const makeId = () => `msg-${Date.now()}-${idCounter++}`;

/**
 * Shared chat hook for:
 *  - /chat      (mode: 'chat')
 *  - /assistant (mode: 'assistant')
 *
 * It:
 *  - Keeps local messages state
 *  - Sends POST /mcp/chat with { prompt, mode }
 *  - Handles tool buttons via send(commandText)
 */
export function useAssistantChat({ mode = 'chat' } = {}) {
  const [messages, setMessages] = useState(() => {
    const greeting =
      mode === 'assistant'
        ? 'Hello! How can I help you with your lab environment today?'
        : 'Hello! How can I help you today?';

    return [
      {
        id: makeId(),
        role: 'assistant',
        content: greeting,
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetError = useCallback(() => setError(null), []);

  /**
   * Send a message.
   * - If textOverride is provided, use that (for tool buttons).
   * - Otherwise use the current input state.
   */
  const send = useCallback(
  async (textOverride) => {
    // 1) Decide what text we’re sending
    const raw = textOverride != null ? textOverride : input;
    const text = (raw || '').trim();
    if (!text) return;

    // 2) Build optimistic user message (with id for React keys)
    const userMsg = {
      id: makeId(),
      role: 'user',
      content: text,
    };

    // 3) Push user message and clear the input immediately
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // 4) Build simple history array (roles + content only)
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // *** IMPORTANT PART ***
      // Backend wants `prompt` or `message` at top level.
      // We give it `prompt` plus an optional `history` and `mode`.
      const res = await axios.post('/mcp/chat', {
        prompt: text,   // <- satisfies backend requirement
        mode,
        history,        // <- optional, backend can use or ignore
      });

      const data = res.data || {};

// Prefer a top-level string-like answer first
let primary =
  data.output ??
  data.message ??
  data.reply ??
  data.text ??
  null;

// If no primary string, but we have a nested `response` object (your tool shape),
// unwrap that and pretty-print it.
if (!primary && data.response) {
  primary = data.response;
}

// Fallback: if primary is still null, just use the whole payload
const payloadToRender = primary ?? data;

const assistantText =
  typeof payloadToRender === 'string'
    ? payloadToRender
    : JSON.stringify(payloadToRender, null, 2);


      const assistantMsg = {
        id: makeId(),
        role: 'assistant',
        content: assistantText,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Assistant chat error:', err);

      if (err.response && err.response.data) {
        const detail =
          err.response.data.detail ||
          err.response.data.error ||
          JSON.stringify(err.response.data);
        setError(`Assistant error: ${detail}`);
      } else if (err.message) {
        setError(`Assistant error: ${err.message}`);
      } else {
        setError('Assistant error: Unknown problem talking to server.');
      }
    } finally {
      setLoading(false);
    }
  },
  [input, mode, messages]
);



  return {
    messages,
    input,
    setInput,
    loading,
    error,
    send, // can be called as send() or send('!os')
    resetError,
  };
}

export default useAssistantChat;
