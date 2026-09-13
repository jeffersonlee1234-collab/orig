import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5173', 10);

const distPath = path.join(__dirname, 'dist');

// Health check endpoint for Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

// Proxy API and Uploads to backend
let rawBackendUrl = (
  process.env.BACKEND_URL ||
  process.env.VITE_API_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://backend-production-1736.up.railway.app'
).trim();

if (rawBackendUrl.startsWith('VITE_API_URL=')) {
  rawBackendUrl = rawBackendUrl.replace(/^VITE_API_URL=/, '').trim();
}
if (rawBackendUrl.startsWith('VITE_API_BASE_URL=')) {
  rawBackendUrl = rawBackendUrl.replace(/^VITE_API_BASE_URL=/, '').trim();
}
if (!rawBackendUrl.startsWith('http://') && !rawBackendUrl.startsWith('https://')) {
  rawBackendUrl = `https://${rawBackendUrl}`;
}
const BACKEND_URL = rawBackendUrl.replace(/\/+$/, '');

app.use(['/api', '/uploads'], async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}${req.originalUrl}`;
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    }

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half';
    }

    const proxyRes = await fetch(targetUrl, fetchOptions);
    res.status(proxyRes.status);
    proxyRes.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    const arrayBuffer = await proxyRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.warn(`[Proxy warning] Failed to reach backend at ${BACKEND_URL}:`, err.message);
    res.status(502).json({
      success: false,
      message: 'Hindi makonekta sa backend server.',
      error: err.message,
    });
  }
});

if (fs.existsSync(distPath)) {
  // 1. Static assets with proper cache headers
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // 2. Handle missing / stale JS/CSS chunk requests from old browser sessions without throwing MIME error
  app.use('/assets', (req, res) => {
    if (req.path.endsWith('.js') || req.path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(200).send(`
        console.warn("[App Update] New version deployed. Reloading page...");
        if (!sessionStorage.getItem("__auto_reloaded_for_build")) {
          sessionStorage.setItem("__auto_reloaded_for_build", "true");
          window.location.reload();
        }
      `);
    }
    if (req.path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send('/* Asset updated */');
    }
    res.status(404).send('Asset not found');
  });

  // 3. SPA Route Fallback (HTML only)
  app.get('*', (req, res) => {
    // If request was looking for a static asset (.js, .css, .png, etc.), return 404, not index.html
    if (/\.(js|mjs|css|map|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) {
      if (req.path.endsWith('.js') || req.path.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send('window.location.reload();');
      }
      return res.status(404).send('Not found');
    }

    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(indexPath);
    } else {
      res.status(200).send('<h1>App is building, please refresh in a moment...</h1>');
    }
  });
} else {
  app.get('*', (req, res) => {
    res.status(200).send('<h1>App is starting, please refresh in a moment...</h1>');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server listening on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Proxying API to: ${BACKEND_URL}`);
});
