module.exports = async (req, res) => {
  try {
    const { Innertube, ClientType } = await import('youtubei.js');
    const clients = [ClientType.ANDROID, ClientType.TV_EMBEDDED, ClientType.WEB, ClientType.MWEB, ClientType.ANDROID_MUSIC];
    const report = {};

    for (const c of clients) {
      try {
        const yt = await Innertube.create({ client_type: c });
        const info = await yt.getBasicInfo('kaMB6Rw8XzA');
        report[c] = {
          playability: info.playability_status?.status,
          reason: info.playability_status?.reason,
          adaptive: info.streaming_data?.adaptive_formats?.length || 0,
          regular: info.streaming_data?.formats?.length || 0
        };
      } catch (e) {
        report[c] = { error: e.message };
      }
    }
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
