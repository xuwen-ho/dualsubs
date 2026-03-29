const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const manifest = require("../lib/manifest");
const { fetchSrt } = require("../lib/opensubtitles");
const { mergeSrts } = require("../lib/merge");

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async ({ type, id }) => {
  // id format: "tt1234567" for movies, "tt1234567:1:2" for series (season:episode)
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : undefined;
  const episode = parts[2] ? parseInt(parts[2]) : undefined;

  console.log(`[DualSubs] Request: type=${type} imdb=${imdbId} S${season}E${episode}`);

  try {
    // Fetch both subtitle tracks in parallel
    const [spanishSrt, englishSrt] = await Promise.all([
      fetchSrt(imdbId, "es", season, episode),
      fetchSrt(imdbId, "en", season, episode),
    ]);

    if (!spanishSrt && !englishSrt) {
      console.log("[DualSubs] No subtitles found for either language");
      return { subtitles: [] };
    }

    // If only one language is available, still provide it as a single-language VTT
    let vttContent;
    if (spanishSrt && englishSrt) {
      vttContent = mergeSrts(spanishSrt, englishSrt);
    } else if (spanishSrt) {
      vttContent = mergeSrts(spanishSrt, "");
    } else {
      vttContent = mergeSrts("", englishSrt);
    }

    // Encode the VTT as a base64 data URL that Stremio can consume directly
    const base64Vtt = Buffer.from(vttContent, "utf-8").toString("base64");
    const dataUrl = `data:text/vtt;base64,${base64Vtt}`;

    return {
      subtitles: [
        {
          id: "dualsubs-es-en",
          url: dataUrl,
          lang: "Dual (ES/EN)",
        },
      ],
    };
  } catch (err) {
    console.error("[DualSubs] Error:", err.message);
    return { subtitles: [] };
  }
});

const addonInterface = builder.getInterface();

// Export the Express router for Vercel serverless
const router = getRouter(addonInterface);

// Vercel expects a default export that is a request handler
module.exports = (req, res) => {
  // Strip /api/addon prefix if present (Vercel rewrites route here)
  router(req, res);
};
