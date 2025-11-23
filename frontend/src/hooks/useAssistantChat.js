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
      const raw = textOverride != null ? textOverride : input;
      const text = (raw || '').trim();
      if (!text) return;

      // Optimistic user message
      const userMsg = {
        id: makeId(),
        role: 'user',
        content: text,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput(''); // clear box right away
      setLoading(true);
      setError(null);

      try {
        // Backend expects `prompt` or `message`.
        // Script Lab already uses `prompt`, so we keep it consistent.
        const res = await axios.post('/mcp/chat', {
          prompt: text,
          mode,
        });

        const data = res.data || {};
        const assistantText =
          data.output ??
          data.message ??
          data.reply ??
          (typeof data === 'string'
            ? data
            : JSON.stringify(data, null, 2));

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
    [input, mode]
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
