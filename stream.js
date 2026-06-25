/**
 * stream.js — Shared SSE streaming helper for JSN REPS apps
 *
 * Usage:
 *   const fullText = await streamSSE(response, (text) => {
 *     myEl.innerHTML = renderMarkdown(text) + '<span class="cursor"></span>';
 *   });
 *
 * @param {Response} response  — fetch() Response with stream: true
 * @param {function(string): void} onChunk — called with full accumulated text after each delta
 * @returns {Promise<string>} — resolves with the complete response text
 */
async function streamSSE(response, onChunk) {
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let fullText  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Buffered decode: hold any incomplete trailing line across chunks
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // last element may be an incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          fullText += parsed.delta.text;
          onChunk(fullText);
        }
      } catch (_) {}
    }
  }

  return fullText;
}
