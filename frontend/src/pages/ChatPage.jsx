// frontend/src/pages/ChatPage.jsx
import React, {
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useContentEngineChat } from "../hooks/useContentEngineChat";
import "./ChatPage.css";

const ChatPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const intent = params.get("intent");
  const product = params.get("product");

  const isPhotoCheck = intent === "photo-check";
  const productLabel =
    product === "night-light"
      ? "night light"
      : product === "cylinder-lamp"
      ? "cylinder lamp"
      : product === "globe-lamp"
      ? "globe lamp"
      : "lithophane";

  const photoCheckIntro = `Hi! I can help check whether your photo will work well for a ${productLabel}.\nUpload the image you want to use, and I’ll help review:\n- brightness and contrast\n- face/detail visibility\n- cropping issues\n- whether it fits best as a night light, small shade, medium shade, or large shade`;

  const [photoName, setPhotoName] = useState('');
  const [photoEmail, setPhotoEmail] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCheckError, setPhotoCheckError] = useState('');
  const [photoCheckSuccess, setPhotoCheckSuccess] = useState('');
  const [isSubmittingPhotoCheck, setIsSubmittingPhotoCheck] = useState(false);

  const chatSessionIdRef = useRef(`chat-${Date.now()}`);
  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
  } = useContentEngineChat({
    mode: "assistant",
    sessionId: chatSessionIdRef.current,
    model: "HexForge Scribe",
    initialMessages: isPhotoCheck ? [{ role: "assistant", content: photoCheckIntro }] : [],
  });

  


  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Simple "boot" delay so the model feels like it's waking up
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleChange = useCallback(
  (e) => {
    setInput(e.target.value);
  },
  [setInput]
);

const handleKeyDown = useCallback(
  (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && bootDone) {
        sendMessage();
      }
    }
  },
  [sendMessage, isLoading, bootDone]
);

const handleClickSend = useCallback(() => {
  if (!isLoading && bootDone) {
    sendMessage();
  }
}, [sendMessage, isLoading, bootDone]);

const handlePhotoFileChange = useCallback((e) => {
  const file = e.target.files?.[0] || null;
  setPhotoFile(file);
}, []);

const handleSubmitPhotoCheck = useCallback(
  async (e) => {
    e.preventDefault();
    setPhotoCheckError('');
    setPhotoCheckSuccess('');

    if (!photoName.trim() || !photoEmail.trim() || !photoFile) {
      setPhotoCheckError('Please provide your name, email, and a photo to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('name', photoName.trim());
    formData.append('email', photoEmail.trim());
    formData.append('product', product || 'custom-lithophane');
    formData.append('image', photoFile);

    setIsSubmittingPhotoCheck(true);

    try {
      const response = await fetch('/api/photo-checks', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.errors?.[0] || result?.message || 'Unable to submit photo check.');
      }

      setPhotoCheckSuccess(`Photo check request received. Request ID: ${result.requestId}`);
      setPhotoName('');
      setPhotoEmail('');
      setPhotoFile(null);
    } catch (err) {
      setPhotoCheckError(err.message || 'Unable to submit photo check.');
    } finally {
      setIsSubmittingPhotoCheck(false);
    }
  },
  [photoName, photoEmail, photoFile, product]
);


  return (
    <div className="hf-chat-page">
      <div className="hf-chat-shell">
        <header className="hf-chat-header">
          <div className="hf-chat-logo">HexForge Labs</div>
          <div className="hf-chat-title">HexForge Assistant</div>
        </header>

        {isPhotoCheck && (
          <section className="hf-photo-check-panel">
            <div className="hf-photo-check-panel__header">
              <div className="hf-photo-check-panel__title">Free Photo Check</div>
              <div className="hf-photo-check-panel__subtitle">
                Submit one image and HexForge will review it for brightness, composition, and suitability for your selected product.
              </div>
            </div>
            <form className="hf-photo-check-form" onSubmit={handleSubmitPhotoCheck}>
              <label className="hf-photo-check-field">
                <span>Name</span>
                <input
                  type="text"
                  className="hf-photo-check-input"
                  value={photoName}
                  onChange={(e) => setPhotoName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="hf-photo-check-field">
                <span>Email</span>
                <input
                  type="email"
                  className="hf-photo-check-input"
                  value={photoEmail}
                  onChange={(e) => setPhotoEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="hf-photo-check-field">
                <span>Product</span>
                <input
                  type="text"
                  className="hf-photo-check-input"
                  value={productLabel}
                  readOnly
                />
              </label>
              <label className="hf-photo-check-field">
                <span>Upload a photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hf-photo-check-file"
                  onChange={handlePhotoFileChange}
                />
              </label>
              {photoFile && (
                <div className="hf-photo-check-file-info">
                  Selected file: {photoFile.name} ({Math.round(photoFile.size / 1024)} KB)
                </div>
              )}
              {photoCheckError && (
                <div className="hf-chat-error">{photoCheckError}</div>
              )}
              {photoCheckSuccess && (
                <div className="hf-chat-success">{photoCheckSuccess}</div>
              )}
              <button
                type="submit"
                className="hf-photo-check-submit"
                disabled={isSubmittingPhotoCheck}
              >
                {isSubmittingPhotoCheck ? 'Submitting…' : 'Submit Photo Check'}
              </button>
            </form>
          </section>
        )}

        <main className="hf-chat-main">
          <div className="hf-chat-messages">
            {/* Light boot hint while the assistant is "spinning up" */}
            {!bootDone && (
              <div className="hf-chat-message hf-chat-message--assistant">
                <div className="hf-chat-message-role">Assistant</div>
                <div className="hf-chat-message-body hf-chat-typing">
                  Connecting to HexForge Scribe core…
                </div>
              </div>
            )}

              {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  "hf-chat-message " +
                  (msg.role === "assistant"
                    ? "hf-chat-message--assistant"
                    : "hf-chat-message--user")
                }
              >
                <div className="hf-chat-message-role">
                  {msg.role === "assistant" ? "Assistant" : "You"}
                </div>
                <div className="hf-chat-message-body">
                  {msg.content}
                </div>
              </div>
            ))}


            {isLoading && (
              <div className="hf-chat-message hf-chat-message--assistant">
                <div className="hf-chat-message-role">Assistant</div>
                <div className="hf-chat-message-body hf-chat-typing">
                  Thinking…
                </div>
              </div>
            )}

           

            <div ref={bottomRef} />
          </div>
        </main>

        <footer className="hf-chat-input-bar">
          <textarea
            ref={inputRef}
            className="hf-chat-input"
            placeholder={
              bootDone
                ? 'Ask or command… (prefix with "blog-draft" to send to content engine)'
                : 'Connecting to HexForge Scribe…'
            }
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !bootDone}
            rows={1}
          />
          <button
            className="hf-chat-send"
            onClick={handleClickSend}
            disabled={isLoading || !bootDone || !input.trim()}
            aria-label="Send message"
          >
            ▶
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;
