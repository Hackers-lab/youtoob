const ytSearch = require('yt-search');
const { Innertube, ClientType, UniversalCache } = require('youtubei.js');

let innertubeInstance = null;

/**
 * Gets or initializes the cached Innertube client with iOS client headers.
 */
async function getInnertube() {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create({
      client_type: ClientType.IOS,
      cache: new UniversalCache(false)
    });
  }
  return innertubeInstance;
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
