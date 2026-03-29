const axios = require("axios");

const OS_API = "https://api.opensubtitles.com/api/v1";

function getApiKey() {
  const key = process.env.OPENSUBTITLES_API_KEY;
  if (!key) {
    throw new Error(
      "OPENSUBTITLES_API_KEY environment variable is not set. " +
        "Get a free key at https://www.opensubtitles.com/consumers"
    );
  }
  return key;
}

const headers = () => ({
  "Api-Key": getApiKey(),
  "Content-Type": "application/json",
  "User-Agent": "DualSubs Stremio Addon v1.0.0",
});

/**
 * Search for subtitles on OpenSubtitles.
 * Returns the download URL for the best match, or null.
 */
async function searchSubtitle(imdbId, language, season, episode) {
  const params = {
    imdb_id: imdbId.replace("tt", ""),
    languages: language,
    order_by: "download_count",
    order_direction: "desc",
  };

  if (season !== undefined && episode !== undefined) {
    params.season_number = season;
    params.episode_number = episode;
  }

  console.log(`[DualSubs] Searching OpenSubtitles: lang=${language} imdb=${imdbId}`);

  const { data } = await axios.get(`${OS_API}/subtitles`, {
    headers: headers(),
    params,
    timeout: 10000,
  });

  console.log(`[DualSubs] Search result: ${data.data?.length || 0} results for ${language}`);

  if (!data.data || data.data.length === 0) return null;

  // Pick the first (highest download count) result
  const best = data.data[0];
  const fileId = best.attributes.files[0]?.file_id;
  if (!fileId) return null;

  return fileId;
}

/**
 * Request a temporary download link for a subtitle file.
 */
async function downloadSubtitle(fileId) {
  console.log(`[DualSubs] Downloading file_id: ${fileId}`);

  const { data } = await axios.post(
    `${OS_API}/download`,
    { file_id: fileId },
    { headers: headers(), timeout: 10000 }
  );

  console.log(`[DualSubs] Got download link, fetching SRT...`);

  const { data: srtData } = await axios.get(data.link, {
    responseType: "text",
    timeout: 10000,
  });

  return srtData;
}

/**
 * Fetch the SRT text for a given IMDB ID and language.
 * Returns null if not found.
 */
async function fetchSrt(imdbId, language, season, episode) {
  const fileId = await searchSubtitle(imdbId, language, season, episode);
  if (!fileId) return null;
  return downloadSubtitle(fileId);
}

module.exports = { fetchSrt };
