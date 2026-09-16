const ytSearch = require('yt-search');
const os = require('os');

let innertubePromise = null;

// Attempt to load local .env if running in Node environment with loadEnvFile
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (_) {}

/**
 * Extracts YouTube cookie from environment variables, handling UTF-8 BOM prefixes if present.
 */
function getYoutubeCookie() {
  if (process.env.YOUTUBE_COOKIE) return process.env.YOUTUBE_COOKIE;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.includes('YOUTUBE_COOKIE') && value) {
      return value;
    }
  }
  return undefined;
}

/**
 * Sanitizes cookie string to keep essential tokens while stripping __Secure-1PSIDTS
 * (which causes 400 Bad Request in YouTube Innertube API).
 */
function sanitizeCookie(raw) {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').trim();
  const pairs = cleaned.split(';').map(p => p.trim()).filter(p => {
    const k = p.split('=')[0];
    return k && k !== '__Secure-1PSIDTS';
  });
  return pairs.length > 0 ? pairs.join('; ') : cleaned;
}

const innertubeClients = new Map();

/**
 * Gets or initializes a cached Innertube client for the specified client type.
 */
async function getInnertube(clientType) {
  const { Innertube, UniversalCache } = await import('youtubei.js');
  const tmpDir = os.tmpdir() || '/tmp';
  const cookie = sanitizeCookie(getYoutubeCookie());
  return await Innertube.create({
    client_type: clientType,
    cookie: cookie,
    cache: new UniversalCache(true, tmpDir)
  });
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
 * Resolves direct HTTPS audio stream URL with fallback across multiple device client types
 * (iOS -> Android VR -> VisionOS) to guarantee bypass of datacenter bot checks.
 * @param {string} videoId 
 * @returns {Promise<{url: string, mimeType: string, clientUsed: string}>}
 */
async function getAudioStream(videoId) {
  const { ClientType } = await import('youtubei.js');
  const candidates = [
    ClientType.IOS,
    ClientType.ANDROID_VR,
    ClientType.VISIONOS
  ];

  let lastError = null;

  for (const clientType of candidates) {
    try {
      if (!innertubeClients.has(clientType)) {
        innertubeClients.set(clientType, getInnertube(clientType));
      }
      const yt = await innertubeClients.get(clientType);
      const info = await yt.getBasicInfo(videoId);

      if (info.playability_status?.status === 'LOGIN_REQUIRED') {
        lastError = new Error('YouTube is blocking cloud datacenter requests (' + (info.playability_status?.reason || 'bot check') + '). Add YOUTUBE_COOKIE in Vercel settings to bypass.');
        continue;
      }

      const formats = info.streaming_data?.adaptive_formats || [];

      // Prefer audio/mp4 (AAC) format natively supported by Amazon Echo
      const audioFormat = formats.find(f => f.mime_type && f.mime_type.includes('audio/mp4') && f.url)
                       || formats.find(f => f.has_audio && f.url);

      if (audioFormat && audioFormat.url) {
        return {
          url: audioFormat.url,
          mimeType: audioFormat.mime_type,
          clientUsed: clientType
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No direct playable audio stream found for video: ' + videoId);
}

module.exports = {
  searchSong,
  getAudioStream,
  cleanVoiceQuery,
  getYoutubeCookie,
  sanitizeCookie
};
