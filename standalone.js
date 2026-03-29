const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const manifest = require("./lib/manifest");
const { fetchSrt } = require("./lib/opensubtitles");
const { mergeSrts } = require("./lib/merge");

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async ({ type, id }) => {
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : undefined;
  const episode = parts[2] ? parseInt(parts[2]) : undefined;

  console.log(`[DualSubs] Request: type=${type} imdb=${imdbId} S${season}E${episode}`);

  try {
    const [spanishSrt, englishSrt] = await Promise.all([
      fetchSrt(imdbId, "es", season, episode),
      fetchSrt(imdbId, "en", season, episode),
    ]);

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

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
console.log(
  `[DualSubs] Addon running at http://localhost:${process.env.PORT || 7000}`
);
