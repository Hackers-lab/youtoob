const ytSearch = require('yt-search');

const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://yewtu.be',
  'https://iv.nboeck.de',
  'https://invidious.nerdvpn.de',
  'https://invidious.private.coffee',
  'https://invidious.perennialte.ch'
];

/**
 * Searches YouTube for a track matching the query.
 * @param {string} query 
 * @returns {Promise<{videoId: string, title: string, artist: string, duration: string, thumbnail: string}>}
 */
async function searchSong(query) {
  const cleanQuery = query.replace(/on (my music|youtube|youtube music)/gi, '').trim();
  const searchResults = await ytSearch(cleanQuery);
  const video = searchResults && searchResults.videos && searchResults.videos[0];
  if (!video) {
    throw new Error('No song found matching ' + cleanQuery);
  }
  return {
    videoId: video.videoId,
    title: video.title,
    artist: video.author ? video.author.name : 'Unknown Artist',
    duration: video.timestamp,
    thumbnail: video.thumbnail
  };
}

/**
 * Fetches stream info from a single Invidious instance.
 */
async function fetchFromInstance(instance, videoId, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`Instance ${instance} returned HTTP ${res.status}`);
    }
    const data = await res.json();
    const formats = data.adaptiveFormats || [];
    // Prefer audio/mp4 (AAC) which is strictly supported by Alexa AudioPlayer
    const audio = formats.find(f => f.type && f.type.startsWith('audio/mp4'))
               || formats.find(f => f.type && f.type.startsWith('audio'));
    if (!audio || !audio.url) {
      throw new Error(`No audio stream found on ${instance}`);
    }
    return {
      url: audio.url,
      mimeType: audio.type,
      instance
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Resolves direct HTTPS audio stream URL by racing multiple instances.
 * @param {string} videoId 
 * @returns {Promise<{url: string, mimeType: string}>}
 */
async function getAudioStream(videoId) {
  const requests = INVIDIOUS_INSTANCES.map(inst => fetchFromInstance(inst, videoId));
  try {
    const result = await Promise.any(requests);
    return result;
  } catch (err) {
    throw new Error('Unable to extract audio stream from any mirror: ' + err.message);
  }
}

module.exports = {
  searchSong,
  getAudioStream
};
