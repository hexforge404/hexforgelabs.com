// /frontend/src/utils/parseSSEStream.js

export async function* parseSSEStream(reader) {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Save last partial line

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;

      const payload = line.slice(5).trim();
      try {
        const json = JSON.parse(payload);
        if (typeof json.response === 'string') {
          yield json.response;
        } else {
          yield JSON.stringify(json.response);
        }
      } catch (err) {
        console.warn('Unparsable SSE line:', payload);
        yield payload; // Fallback to raw
      }
    }
  }
}
