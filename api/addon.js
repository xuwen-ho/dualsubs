const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const manifest = require("../lib/manifest");
const { fetchSrt } = require("../lib/opensubtitles");
const { mergeSrts } = require("../lib/merge");

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async ({ type, id }) => {
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : undefined;
  const episode = parts[2] ? parseInt(parts[2]) : undefined;

  console.log(`[DualSubs] Subtitle request: type=${type} id=${id}`);

  try {
    const [spanishSrt, englishSrt] = await Promise.all([
      fetchSrt(imdbId, "es", season, episode),
      fetchSrt(imdbId, "en", season, episode),
    ]);

    console.log(
      `[DualSubs] Fetched: ES=${spanishSrt ? spanishSrt.length + " chars" : "null"}, EN=${englishSrt ? englishSrt.length + " chars" : "null"}`
    );

    if (!spanishSrt && !englishSrt) {
      return { subtitles: [] };
    }

    let vttContent;
    if (spanishSrt && englishSrt) {
      vttContent = mergeSrts(spanishSrt, englishSrt);
    } else if (spanishSrt) {
      vttContent = mergeSrts(spanishSrt, "");
    } else {
      vttContent = mergeSrts("", englishSrt);
    }

    console.log(`[DualSubs] Merged VTT: ${vttContent.length} chars`);

    // Encode as base64 data URL — works directly, no second request needed
    const base64Vtt = Buffer.from(vttContent, "utf-8").toString("base64");

    return {
      subtitles: [
        {
          id: "dualsubs-es-en",
          url: `data:text/vtt;base64,${base64Vtt}`,
          lang: "spa",
        },
      ],
    };
  } catch (err) {
    console.error("[DualSubs] Error:", err.response?.status, err.message);
    if (err.response?.data) {
      console.error("[DualSubs] Response:", JSON.stringify(err.response.data));
    }
    return { subtitles: [] };
  }
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
