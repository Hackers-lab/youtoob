const { searchSong, getAudioStream, getYoutubeCookie, sanitizeCookie } = require('../lib/youtube');

module.exports = async (req, res) => {
  const q = req.query.q || 'tare zameen par';
  const rawCookie = getYoutubeCookie();
  const sanitized = sanitizeCookie(rawCookie);

  const matchedTokens = sanitized
    ? sanitized.split(';').map(p => p.trim().split('=')[0]).filter(Boolean)
    : [];

  const envKeysFound = Object.keys(process.env).filter(k => k.includes('YOUTUBE'));

  const report = {
    query: q,
    hasCookieConfigured: !!rawCookie,
    cookieRawLength: rawCookie ? rawCookie.length : 0,
    matchedTokensCount: matchedTokens.length,
    matchedTokens: matchedTokens,
    detectedEnvKeys: envKeysFound
  };

  try {
    const t0 = Date.now();
    const song = await searchSong(q);
    report.song = song;
    report.searchMs = Date.now() - t0;

    const t1 = Date.now();
    const stream = await getAudioStream(song.videoId);
    report.stream = {
      clientUsed: stream.clientUsed,
      mimeType: stream.mimeType,
      streamUrlSample: stream.url ? stream.url.slice(0, 90) : null
    };
    report.streamMs = Date.now() - t1;
    report.status = 'SUCCESS';
    return res.status(200).json(report);
  } catch (err) {
    report.status = 'ERROR';
    report.error = err.message;
    return res.status(200).json(report);
  }
};
