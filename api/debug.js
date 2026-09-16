const { searchSong, getAudioStream } = require('../lib/youtube');

module.exports = async (req, res) => {
  const q = req.query.q || 'tare zameen par';
  const report = {
    query: q,
    hasCookieConfigured: !!process.env.YOUTUBE_COOKIE,
    cookieLength: process.env.YOUTUBE_COOKIE ? process.env.YOUTUBE_COOKIE.length : 0
  };

  try {
    const t0 = Date.now();
    const song = await searchSong(q);
    report.song = song;
    report.searchMs = Date.now() - t0;

    const t1 = Date.now();
    const stream = await getAudioStream(song.videoId);
    report.stream = {
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
