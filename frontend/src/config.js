// frontend/src/config.js

// Pull base URLs from environment variables (set in .env or .env.production)
const ASSISTANT_BASE = process.env.REACT_APP_ASSISTANT_BASE || "https://assistant.hexforgelabs.com";
const API_BASE = process.env.REACT_APP_API_BASE || "https://hexforgelabs.com/api";
const SITE_BASE = process.env.REACT_APP_SITE_BASE || "https://hexforgelabs.com";

export const ASSISTANT_URL = ASSISTANT_BASE;
export const API_URL = API_BASE;
export const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "rduff@hexforgelabs.com";
export const TERMS_OF_SERVICE_URL = `${SITE_BASE}/terms`;
export const PRIVACY_POLICY_URL = `${SITE_BASE}/privacy`;
