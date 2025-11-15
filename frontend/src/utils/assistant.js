// frontend/src/utils/assistant.js

// Health check – returns boolean based only on HTTP success
export async function checkPing() {
  try {
    // Prefer the assistant health endpoint
    let res = await fetch("/mcp/health");

    if (res.ok) {
      // Any 2xx = online
      return true;
    }

    // Fallback to general app health
    res = await fetch("/health");
    if (res.ok) {
      return true;
    }

    return false;
  } catch {
    // Network / other error → offline
    return false;
  }
}

// Generic helper for other assistant calls (if used elsewhere)
export async function fetchAssistantData(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Assistant request failed: ${res.status} – ${text}`);
  }

  const type = res.headers.get("content-type") || "";
  if (type.includes("json")) {
    return res.json();
  }

  return res.text();
}
