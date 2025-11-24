// frontend/src/config.js

// Base URLs for assistant, API, and site.
// ASSISTANT_BASE defaults to "/mcp" so the React hook
// will call POST /mcp/chat by default.
const ASSISTANT_BASE =
  process.env.REACT_APP_ASSISTANT_BASE || "/mcp"; // <- changed default

const API_BASE =
  process.env.REACT_APP_API_BASE || "https://hexforgelabs.com/api";
const SITE_BASE =
  process.env.REACT_APP_SITE_BASE || "https://hexforgelabs.com";

export const ASSISTANT_URL = ASSISTANT_BASE;
export const API_URL = API_BASE;

export const SUPPORT_EMAIL =
  process.env.REACT_APP_SUPPORT_EMAIL || "rduff@hexforgelabs.com";

export const TERMS_OF_SERVICE_URL = `${SITE_BASE}/terms`;
export const PRIVACY_POLICY_URL = `${SITE_BASE}/privacy`;
