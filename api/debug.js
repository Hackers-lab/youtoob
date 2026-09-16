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
    const { Innertube, ClientType, UniversalCache } = await import('youtubei.js');
    const cookie = sanitizeCookie(rawCookie);

    const clientDiagnostics = {};
    const testList = [
      { name: 'IOS_with_cookie', type: ClientType.IOS, cookie },
      { name: 'ANDROID_VR_with_cookie', type: ClientType.ANDROID_VR, cookie },
      { name: 'VISIONOS_with_cookie', type: ClientType.VISIONOS, cookie },
      { name: 'IOS_no_cookie', type: ClientType.IOS, cookie: undefined },
      { name: 'ANDROID_VR_no_cookie', type: ClientType.ANDROID_VR, cookie: undefined },
      { name: 'TV_EMBEDDED_no_cookie', type: ClientType.TV_EMBEDDED, cookie: undefined }
    ];

    for (const item of testList) {
      try {
        const yt = await Innertube.create({
          client_type: item.type,
          cookie: item.cookie,
          cache: new UniversalCache(false)
        });
        const info = await yt.getBasicInfo(song.videoId);
        const formats = info.streaming_data?.adaptive_formats || [];
        const audio = formats.find(f => f.mime_type && f.mime_type.includes('audio/mp4') && f.url)
                   || formats.find(f => f.has_audio && f.url);
        clientDiagnostics[item.name] = {
          status: info.playability_status?.status || 'OK',
          reason: info.playability_status?.reason || null,
          formatsWithUrl: formats.filter(f => f.url).length,
          hasAudioUrl: !!audio?.url,
          sampleUrl: audio?.url ? audio.url.slice(0, 80) : null
        };
      } catch (err) {
        clientDiagnostics[item.name] = { error: err.message };
      }
    }

    report.clientDiagnostics = clientDiagnostics;

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
