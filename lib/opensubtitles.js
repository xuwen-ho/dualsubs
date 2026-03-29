const axios = require("axios");

const OS_ADDON = "https://opensubtitles-v3.strem.io";

// The community addon uses ISO 639-2/B codes (eng, spa, etc.)
// Map the short codes used by the rest of our codebase.
const LANG_MAP = {
  en: "eng",
  es: "spa",
};

/**
 * Build the addon request path for a given IMDB ID.
 * Movies:  /subtitles/movie/tt0111161.json
 * Series:  /subtitles/series/tt0903747:1:1.json
 */
function buildPath(imdbId, season, episode) {
  if (season !== undefined && episode !== undefined) {
    return `/subtitles/series/${imdbId}:${season}:${episode}.json`;
  }
  return `/subtitles/movie/${imdbId}.json`;
}

/**
 * Query the OpenSubtitles V3 community addon and return all available
 * subtitle entries for the given IMDB id.
 */
async function queryAddon(imdbId, season, episode) {
  const path = buildPath(imdbId, season, episode);
  const url = `${OS_ADDON}${path}`;

  console.log(`[DualSubs] Querying addon: ${url}`);

  const { data } = await axios.get(url, { timeout: 15000 });

  console.log(`[DualSubs] Addon returned ${data.subtitles?.length || 0} subtitle entries`);
  return data.subtitles || [];
}

/**
 * Download the raw SRT/text content from a subtitle URL.
 */
async function downloadSubtitle(subtitleUrl) {
  console.log(`[DualSubs] Downloading subtitle from: ${subtitleUrl}`);

  const { data } = await axios.get(subtitleUrl, {
    responseType: "text",
    timeout: 15000,
  });

  return data;
}

/**
 * Fetch the SRT text for a given IMDB ID and language.
 * Returns null if not found.
 *
 * This is the proxy approach: instead of calling the OpenSubtitles REST API
 * with an API key, we query the public community addon and download the
 * subtitle file it points to.
 */
async function fetchSrt(imdbId, language, season, episode, subIndex = 0) {
  const langCode = LANG_MAP[language] || language;

  const allSubs = await queryAddon(imdbId, season, episode);

  // Filter all subtitles matching the requested language
  const matches = allSubs.filter((sub) => sub.lang === langCode);

  if (matches.length === 0 || subIndex >= matches.length) {
    console.log(`[DualSubs] No subtitle found for lang=${langCode} at index ${subIndex}`);
    return null;
  }

  const match = matches[subIndex];

  console.log(`[DualSubs] Found subtitle id=${match.id} for lang=${langCode} at index ${subIndex}`);
  return downloadSubtitle(match.url);
}

module.exports = { fetchSrt };
