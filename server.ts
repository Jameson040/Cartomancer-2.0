import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Accept large payloads up to 150MB for bulk asset uploading
  app.use(express.json({ limit: '150mb' }));
  app.use(express.urlencoded({ extended: true, limit: '150mb' }));

  // Helper to infer category based on filename and archetype
  function inferCategory(name: string, fallbackCategory?: string): string {
    const clean = (name || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (/tree|forest|pine|oak|wood|flora|plant|bush|jungle|willow|grove/.test(clean)) return 'trees';
    if (/swamp|marsh|bog|fen|mangrove|mire|quagmire/.test(clean)) return 'swamps';
    if (/lake|pond|lagoon|reservoir/.test(clean)) return 'lakes';
    if (/pier|dock|wharf|quay|jetty/.test(clean)) return 'piers';
    if (/camp|carriage|wagon|cart|tent|caravan|yurt/.test(clean)) return 'camping_carriage';
    if (/fort|rampart|bastion|outpost/.test(clean)) return 'forts';
    if (/castle|spire|tower|citadel|keep|palace|stronghold/.test(clean)) return 'castles';
    if (/mountain|hill|peak|cliff|ridge|rock|cave|volcano|crag/.test(clean)) return 'mountains';
    if (/settlement|city|town|village|house|hamlet|farm|market|tavern|dwelling/.test(clean)) return 'settlements';
    if (/ship|boat|sea|maritime|ocean|anchor|kraken|vessel|harbor|isle|island/.test(clean)) return 'water_maritime';
    if (/building|wall|block|road|bridge|gate|fence|paved/.test(clean)) return 'building_blocks';
    if (/compass|banner|frame|cartouche|scroll|ribbon|border|badge|crest/.test(clean)) return 'decorations';
    if (/prop|chest|monster|relic|ruin|skull|dungeon|statue|altar/.test(clean)) return 'nature_props';
    if (fallbackCategory && fallbackCategory !== 'custom' && fallbackCategory !== 'all') {
      return fallbackCategory.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    }
    return 'custom';
  }

  // API endpoint: Turn uploaded assets into permanent files in src/assets/stamps/<category>/
  app.post('/api/permanentize-assets', async (req, res) => {
    try {
      const { assets } = req.body;
      if (!Array.isArray(assets) || assets.length === 0) {
        return res.status(400).json({ error: 'No assets provided in payload' });
      }

      const stampsRoot = path.join(__dirname, 'src', 'assets', 'stamps');
      if (!fs.existsSync(stampsRoot)) {
        fs.mkdirSync(stampsRoot, { recursive: true });
      }

      const categoryCounts: Record<string, number> = {};
      let savedCount = 0;

      for (const asset of assets) {
        if (!asset || (!asset.imageUrl && !asset.svgData)) continue;

        const category = inferCategory(asset.name || '', asset.category);
        const categoryDir = path.join(stampsRoot, category);
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }

        let baseName = (asset.name || `stamp_${Date.now()}`)
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\s+/g, '_');

        if (asset.imageUrl && asset.imageUrl.startsWith('data:')) {
          const match = asset.imageUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (match) {
            let ext = match[1].toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';
            if (ext === 'svg+xml') ext = 'svg';

            if (!baseName.toLowerCase().endsWith(`.${ext}`)) {
              baseName = `${baseName}.${ext}`;
            }

            const filePath = path.join(categoryDir, baseName);
            const buffer = Buffer.from(match[2], 'base64');
            fs.writeFileSync(filePath, buffer);
            savedCount++;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            continue;
          }
        }

        if (asset.svgData) {
          if (!baseName.toLowerCase().endsWith('.svg')) {
            baseName = `${baseName}.svg`;
          }
          const filePath = path.join(categoryDir, baseName);
          fs.writeFileSync(filePath, asset.svgData, 'utf-8');
          savedCount++;
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          continue;
        }
      }

      return res.json({
        success: true,
        savedCount,
        categories: categoryCounts,
        message: `Successfully saved ${savedCount} assets across ${Object.keys(categoryCounts).length} categories to src/assets/stamps/`,
      });
    } catch (err: any) {
      console.error('Failed to permanentize assets:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // API endpoint: Get live stats on assets currently in src/assets/stamps/
  app.get('/api/asset-stats', (_req, res) => {
    try {
      const stampsRoot = path.join(__dirname, 'src', 'assets', 'stamps');
      if (!fs.existsSync(stampsRoot)) {
        return res.json({ categories: {} });
      }
      const entries = fs.readdirSync(stampsRoot, { withFileTypes: true });
      const categories: Record<string, number> = {};
      let total = 0;
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderPath = path.join(stampsRoot, entry.name);
          const files = fs.readdirSync(folderPath).filter((f) => !f.startsWith('.'));
          categories[entry.name] = files.length;
          total += files.length;
        }
      }
      return res.json({ categories, total });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Mount Vite development server or static files
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Cartomancer server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Cartomancer server:', err);
  process.exit(1);
});
