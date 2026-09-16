const ytSearch = require('yt-search');
const os = require('os');

let innertubePromise = null;

/**
 * Sanitizes cookie string to keep core authentication tokens required by YouTube.
 */
function sanitizeCookie(raw) {
  if (!raw) return undefined;
  const keep = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', 'LOGIN_INFO', '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PAPISID', '__Secure-3PAPISID'];
  const pairs = raw.split(';').map(p => p.trim()).filter(p => {
    const k = p.split('=')[0];
    return keep.includes(k);
  });
  return pairs.length > 0 ? pairs.join('; ') : raw;
}

/**
 * Gets or initializes the cached Innertube client with dynamic ESM import and iOS client headers.
 */
async function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = (async () => {
      const { Innertube, ClientType, UniversalCache } = await import('youtubei.js');
      const tmpDir = os.tmpdir() || '/tmp';
      const cookie = sanitizeCookie(process.env.YOUTUBE_COOKIE);
      return await Innertube.create({
        client_type: ClientType.IOS,
        cookie: cookie,
        cache: new UniversalCache(true, tmpDir)
      });
    })();
  }
  return await innertubePromise;
}

/**
 * Cleans the voice query by stripping invocation trailing words.
 */
function cleanVoiceQuery(raw) {
  if (!raw) return '';
  return raw
    .replace(/\b(on|from|in)\s+(youtoob\s*music|youtube\s*music|youtoob|youtube|my\s*music)\b/gi, '')
    .replace(/\b(youtoob\s*music|youtube\s*music|youtoob|youtube|my\s*music)\b/gi, '')
    .trim();
}

/**
 * Searches YouTube for a track matching the query.
 * Prioritizes actual songs / music tracks over 3-hour full movie uploads.
 * @param {string} query 
 * @returns {Promise<{videoId: string, title: string, artist: string, duration: string, thumbnail: string}>}
 */
async function searchSong(query) {
  const cleanQuery = cleanVoiceQuery(query);
  const searchResults = await ytSearch(cleanQuery);
  const videos = searchResults && searchResults.videos ? searchResults.videos : [];

  if (!videos.length) {
    throw new Error('No song found matching ' + cleanQuery);
  }

  // Filter: prefer music tracks (under 15 mins) unless query specifically asks for full movie/podcast
  const isLongExplicitlyRequested = /(full movie|podcast|compilation|jukebox|audiobook|playlist)/i.test(cleanQuery);
  let bestVideo = videos[0];

  if (!isLongExplicitlyRequested) {
    const musicCandidate = videos.find(v => v.seconds > 60 && v.seconds <= 900); // 1 to 15 mins
    if (musicCandidate) {
      bestVideo = musicCandidate;
    }
  }

  return {
    videoId: bestVideo.videoId,
    title: bestVideo.title,
    artist: bestVideo.author ? bestVideo.author.name : 'YouTube Music',
    duration: bestVideo.timestamp,
    thumbnail: bestVideo.thumbnail
  };
}

/**
 * Resolves direct HTTPS audio stream URL using YouTube's native iOS client API.
 * This delivers direct, high-speed audio/mp4 (AAC) streams without needing PoToken or BotGuard.
 * @param {string} videoId 
 * @returns {Promise<{url: string, mimeType: string}>}
 */
async function getAudioStream(videoId) {
  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);

  if (info.playability_status?.status === 'LOGIN_REQUIRED') {
    throw new Error('YouTube is blocking cloud datacenter requests (' + (info.playability_status?.reason || 'bot check') + '). Add YOUTUBE_COOKIE in Vercel settings to bypass.');
  }

  const formats = info.streaming_data?.adaptive_formats || [];

  // Prefer audio/mp4 (AAC) format natively supported by Amazon Echo
  const audioFormat = formats.find(f => f.mime_type && f.mime_type.includes('audio/mp4') && f.url)
                   || formats.find(f => f.has_audio && f.url);

  if (!audioFormat || !audioFormat.url) {
    throw new Error('No direct playable audio stream found for video: ' + videoId);
  }

  return {
    url: audioFormat.url,
    mimeType: audioFormat.mime_type
  };
}

module.exports = {
  searchSong,
  getAudioStream,
  cleanVoiceQuery
};
