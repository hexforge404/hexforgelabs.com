const express = require('express');
const router = express.Router();

// Stream endpoint (Assistant mode)
router.post('/stream', async (req, res) => {
  const { prompt } = req.body;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  const chunks = [`💡 Received: ${prompt}\n`, `⏳ Working...\n`, `✅ Done processing\n`];
  let i = 0;

  const stream = new ReadableStream({
    async pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i]);
        i++;
        await new Promise(r => setTimeout(r, 400));
      } else {
        controller.close();
      }
    }
  });

  return res.send(stream);
});

// Chat command endpoint (Tool mode)
router.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  try {
    const result = `✅ Received command: ${prompt}\n🛠 Simulated tool output for: ${prompt}`;
    res.json({ output: result });
  } catch (err) {
    console.error('Error in /mcp/chat:', err);
    res.status(500).json({ output: 'Internal Server Error' });
  }
});

module.exports = router;
