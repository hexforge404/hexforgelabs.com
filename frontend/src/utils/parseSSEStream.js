/**
 * Parses Server-Sent Events (SSE) response stream and passes
 * incremental text chunks to the provided callback.
 */
export async function parseSSEStream(reader, onChunk) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split by event boundaries
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || ""; // keep unfinished chunk

      for (const part of parts) {
        // Each message block may start with "data:"
        const lines = part
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("data:"));
        if (!lines.length) continue;

        // Combine all data lines and remove the prefix
        const raw = lines.map((l) => l.replace(/^data:\s*/, "")).join("\n");

        try {
          const json = JSON.parse(raw);
          if (json.response && onChunk) {
            onChunk(json.response);
          }
        } catch {
          // Fallback if it's just plain text
          if (onChunk) onChunk(raw);
        }
      }
    }

    // Flush remaining buffered text
    if (buffer.trim() && onChunk) {
      onChunk(buffer.trim());
    }
  } catch (err) {
    console.error("Error reading SSE stream:", err);
    if (onChunk) onChunk("(stream error)");
  }
}
