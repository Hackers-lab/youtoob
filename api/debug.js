const { searchSong } = require('../lib/youtube');

const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://yewtu.be',
  'https://iv.nboeck.de',
  'https://invidious.nerdvpn.de',
  'https://invidious.private.coffee',
  'https://invidious.perennialte.ch'
];

module.exports = async (req, res) => {
  const videoId = req.query.v || 'erd3fTm-2t8';
  const results = [];

  for (const inst of INVIDIOUS_INSTANCES) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3500);
    const start = Date.now();
    try {
      const response = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      clearTimeout(t);
      const text = await response.text();
      results.push({
        instance: inst,
        status: response.status,
        duration: Date.now() - start,
        bodyPreview: text.slice(0, 150)
      });
    } catch (e) {
      clearTimeout(t);
      results.push({
        instance: inst,
        error: e.message,
        duration: Date.now() - start
      });
    }
  }

  return res.json({ videoId, results });
};
