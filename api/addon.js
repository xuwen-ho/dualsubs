const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const manifest = require("../lib/manifest");

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async ({ type, id, extra }) => {
  const parts = id.split(":");
  const imdbId = parts[0];

  console.log(`[DualSubs] Subtitle request: type=${type} id=${id}`);

  // Build the content ID (imdbId or imdbId:season:episode)
  const contentId = parts.length >= 3 ? `${parts[0]}:${parts[1]}:${parts[2]}` : parts[0];

  // Generate 5 subtitle options for the user so they can select the best synced pair
  const subtitleOptions = Array.from({ length: 5 }).map((_, i) => ({
    id: `dualsubs-es-en-${i}`,
    url: `https://dualsubs.vercel.app/api/vtt?id=${encodeURIComponent(contentId)}&index=${i}`,
    lang: "spa",
  }));

  return {
    subtitles: subtitleOptions,
  };
});

const addonInterface = builder.getInterface();
const sdkRouter = getRouter(addonInterface);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

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
