const { searchSong, getAudioStream } = require('../lib/youtube');

module.exports = async (req, res) => {
  const q = req.query.q || 'tare zameen par';
  try {
    const t0 = Date.now();
    const song = await searchSong(q);
    const searchTime = Date.now() - t0;

    const t1 = Date.now();
    const stream = await getAudioStream(song.videoId);
    const streamTime = Date.now() - t1;

    return res.status(200).json({
      success: true,
      query: q,
      timing: { searchMs: searchTime, streamMs: streamTime, totalMs: Date.now() - t0 },
      song,
      stream: {
        mimeType: stream.mimeType,
        urlPrefix: stream.url ? stream.url.slice(0, 90) : null
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
};
