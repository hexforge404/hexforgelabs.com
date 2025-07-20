const express = require('express');
const router = express.Router();

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

  return res.send(stream); // OR use `res.write()` in raw Node
});

module.exports = router;
