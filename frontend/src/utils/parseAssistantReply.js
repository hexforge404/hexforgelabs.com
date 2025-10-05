export async function parseAssistantReply(res) {
  try {
    const json = await res.json();
    return (
      json.response ||
      json.output ||
      json.result ||
      JSON.stringify(json, null, 2)
    );
  } catch {
    const text = await res.text();
    return text.trim() || "(No output)";
  }
}
