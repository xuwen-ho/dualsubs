const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const manifest = require("./lib/manifest");
const { fetchSrt } = require("./lib/opensubtitles");
const { mergeSrts } = require("./lib/merge");

const PORT = process.env.PORT || 7000;

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async ({ type, id }) => {
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : undefined;
  const episode = parts[2] ? parseInt(parts[2]) : undefined;

  console.log(`[DualSubs] Request: type=${type} id=${id}`);

  const vttUrl = `http://localhost:${PORT}/vtt/${encodeURIComponent(id)}.vtt`;

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

// Use serveHTTP but also add a custom VTT endpoint
const app = require("express")();
const { getRouter } = require("stremio-addon-sdk");

app.get("/vtt/:id.vtt", async (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : undefined;
  const episode = parts[2] ? parseInt(parts[2]) : undefined;

  try {
    const [spanishSrt, englishSrt] = await Promise.all([
      fetchSrt(imdbId, "es", season, episode),
      fetchSrt(imdbId, "en", season, episode),
    ]);

    if (!spanishSrt && !englishSrt) {
      return res.status(404).send("No subtitles found");
    }

    let vtt;
    if (spanishSrt && englishSrt) vtt = mergeSrts(spanishSrt, englishSrt);
    else if (spanishSrt) vtt = mergeSrts(spanishSrt, "");
    else vtt = mergeSrts("", englishSrt);

    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(vtt);
  } catch (err) {
    console.error("[DualSubs] VTT error:", err.message);
    res.status(500).send("Error building subtitles");
  }
});

app.use(getRouter(addonInterface));

app.listen(PORT, () => {
  console.log(`[DualSubs] Addon running at http://localhost:${PORT}`);
  console.log(`[DualSubs] Install in Stremio: http://localhost:${PORT}/manifest.json`);
});
