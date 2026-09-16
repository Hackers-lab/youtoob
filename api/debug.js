const yt = require('../lib/youtube');

module.exports = async (req, res) => {
  try {
    const { Innertube, ClientType } = await import('youtubei.js');
    const instance = await Innertube.create({ client_type: ClientType.IOS });
    const info = await instance.getBasicInfo('kaMB6Rw8XzA');
    const formats = info.streaming_data?.adaptive_formats || [];
    const regularFormats = info.streaming_data?.formats || [];
    
    return res.json({
      adaptiveCount: formats.length,
      adaptive: formats.map(f => ({ mime: f.mime_type, hasUrl: !!f.url, cipher: !!f.signature_cipher })),
      regularCount: regularFormats.length,
      regular: regularFormats.map(f => ({ mime: f.mime_type, hasUrl: !!f.url }))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
};
