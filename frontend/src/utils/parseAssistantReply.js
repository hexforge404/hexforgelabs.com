export async function parseAssistantReply(res) {
  try {
    if (!res.ok) {
      return `(Error ${res.status})`;
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Sometimes backend returns plain text or malformed JSON
      return text || "(empty response)";
    }

    // Always fall back to readable text
    if (typeof data === "string") return data;
    if (data && typeof data.response === "string") return data.response;

    // Fallback: stringify entire object
    return JSON.stringify(data, null, 2);
  } catch (err) {
    console.error("parseAssistantReply failed:", err);
    return "(Error parsing response)";
  }
}
