const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');


const router = express.Router();

// 🔓 OPEN FILE
router.post('/open', (req, res) => {
  const { path: filePath } = req.body;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// 💾 SAVE FILE
router.post('/save', (req, res) => {
  const { path: filePath, content } = req.body;
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ status: 'File saved' });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// ➕ CREATE FILE
router.post('/create', (req, res) => {
  const { path: filePath } = req.body;
  try {
    fs.writeFileSync(filePath, '', 'utf-8');
    res.json({ status: 'File created' });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// ❌ DELETE FILE
router.post('/delete', (req, res) => {
  const { path: filePath } = req.body;
  try {
    fs.unlinkSync(filePath);
    res.json({ status: 'File deleted' });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// 🔁 RENAME FILE
router.post('/rename', (req, res) => {
  const { old_path, new_path } = req.body;
  try {
    fs.renameSync(old_path, new_path);
    res.json({ status: `Renamed to ${new_path}` });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// 📄 PREVIEW FILE
router.post('/preview', (req, res) => {
  const { path: filePath } = req.body;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// 🧪 EXECUTE SCRIPT (Python only for now)
router.post('/execute', (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ output: 'No code provided' });
  }

  try {
    const tempPath = '/tmp/hexforge_run.py';
    fs.writeFileSync(tempPath, content, 'utf-8');
    const output = execSync(`python3 ${tempPath}`, { timeout: 5000 }).toString();
    res.json({ output });
  } catch (err) {
    res.status(500).json({ output: err.message });
  }
});

// 📂 LIST DIRECTORY
// 📂 LIST DIRECTORY with recursion + filter
router.get('/list', (req, res) => {
  const dir = req.query.path || '/mnt/hdd-storage/hexforge-store/test-files';
  const recursive = req.query.recursive === 'true';
  const extensionFilter = req.query.ext || null;

  const walk = (dirPath) => {
    let results = [];
    const list = fs.readdirSync(dirPath);

    list.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (recursive) {
          results = results.concat(walk(fullPath));
        }
      } else {
        if (!extensionFilter || file.endsWith(extensionFilter)) {
          results.push(fullPath);
        }
      }
    });

    const { exec } = require('child_process');

router.post('/terminal', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ output: 'No command provided' });

  exec(command, { timeout: 8000, maxBuffer: 1024 * 1000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(200).json({ output: stderr || err.message });
    }
    res.json({ output: stdout || '(No output)' });
  });
});


    // 🧪 EXECUTE PYTHON CODE
router.post('/execute', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'No code provided' });

  const { exec } = require('child_process');
  const tempPath = '/tmp/editor-run-temp.py';
  const fs = require('fs');

  fs.writeFileSync(tempPath, content);

  exec(`python3 ${tempPath}`, { timeout: 3000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ output: stderr || err.message });
    }
    return res.json({ output: stdout });
  });
});


    return results;
  };

  try {
    const files = walk(dir);
    res.json({ files });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});



module.exports = router;
