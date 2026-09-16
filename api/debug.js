module.exports = async (req, res) => {
  const info = {};
  try {
    info.nodeVersion = process.version;
    info.envTmp = require('os').tmpdir();
    
    try {
      info.importingYoutube = 'starting';
      const yt = require('../lib/youtube');
      info.importingYoutube = 'success';
      
      const q = req.query.q || 'tare zameen par';
      info.song = await yt.searchSong(q);
      info.stream = await yt.getAudioStream(info.song.videoId);
      return res.status(200).json({ success: true, info });
    } catch (importErr) {
      info.importError = importErr.message;
      info.stack = importErr.stack;
      return res.status(200).json({ success: false, error: 'Module Error', info });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
};
