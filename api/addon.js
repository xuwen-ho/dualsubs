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

  console.log(`[DualSubs] Subtitle request: type=${type} id=${id}`);

  // Build VTT URL that points to our own /vtt/ endpoint
  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://dualsubs.vercel.app";
  const vttUrl = `${host}/vtt/${encodeURIComponent(id)}.vtt`;

  return {
    subtitles: [
      {
        id: "dualsubs-es-en",
        url: vttUrl,
        lang: "spa",
      },
    ],
  };
});

const addonInterface = builder.getInterface();
const sdkRouter = getRouter(addonInterface);

/**
 * Fetch both SRTs and return merged VTT content.
 */
async function buildMergedVtt(id) {
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : undefined;
  const episode = parts[2] ? parseInt(parts[2]) : undefined;

  const [spanishSrt, englishSrt] = await Promise.all([
    fetchSrt(imdbId, "es", season, episode),
    fetchSrt(imdbId, "en", season, episode),
  ]);

  if (!spanishSrt && !englishSrt) return null;

  if (spanishSrt && englishSrt) return mergeSrts(spanishSrt, englishSrt);
  if (spanishSrt) return mergeSrts(spanishSrt, "");
  return mergeSrts("", englishSrt);
}

// Vercel serverless handler
module.exports = async (req, res) => {
  // CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Serve merged VTT files at /vtt/:id.vtt
  const vttMatch = req.url.match(/^\/vtt\/(.+)\.vtt$/);
  if (vttMatch) {
    const id = decodeURIComponent(vttMatch[1]);
    console.log(`[DualSubs] VTT request for: ${id}`);
    try {
      const vtt = await buildMergedVtt(id);
      if (vtt) {
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        res.end(vtt);
      } else {
        res.statusCode = 404;
        res.end("No subtitles found");
      }
    } catch (err) {
      console.error("[DualSubs] VTT build error:", err.message);
      res.statusCode = 500;
      res.end("Error building subtitles");
    }
    return;
  }

  // SDK routes (manifest.json, subtitles handler)
  sdkRouter(req, res, () => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<h1>Dual Subtitles (ES/EN) Stremio Addon</h1>' +
        '<p>Install in Stremio by adding: <code>https://' +
        (req.headers.host || "dualsubs.vercel.app") +
        "/manifest.json</code></p>"
    );
  });
};
