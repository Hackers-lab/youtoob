const { searchSong, getAudioStream } = require('../lib/youtube');

module.exports = async (req, res) => {
  const q = req.query.q || 'Shape of You';
  const report = { query: q, steps: [] };

  try {
    report.steps.push('Searching...');
    const song = await searchSong(q);
    report.song = song;
    report.steps.push('Search OK: ' + song.videoId);

    report.steps.push('Resolving audio stream...');
    const stream = await getAudioStream(song.videoId);
    report.stream = {
      instance: stream.instance,
      mimeType: stream.mimeType,
      urlPrefix: stream.url ? stream.url.slice(0, 80) : null
    };
    report.steps.push('Audio stream OK');
    return res.status(200).json(report);
  } catch (err) {
    report.error = err.message;
    report.stack = err.stack;
    return res.status(500).json(report);
  }
};
