export async function parseAssistantReply(res) {
  try {
    if (!res.ok) {
      const errText = await res.text();
      return { response: `Error ${res.status}: ${errText}` };
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await res.json();
      return json?.response
        ? json
        : { response: JSON.stringify(json, null, 2) };
    }

    const text = await res.text();
    return { response: text };
  } catch (err) {
    console.error("parseAssistantReply error:", err);
    return { response: `(Parse error: ${err.message})` };
  }
}
