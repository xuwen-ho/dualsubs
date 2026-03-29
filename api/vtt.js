const { fetchSrt } = require("../lib/opensubtitles");
const { mergeSrts } = require("../lib/merge");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const { id } = req.query;

  if (!id) {
    res.statusCode = 400;
    res.end("Missing id parameter");
    return;
  }

  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] ? parseInt(parts[1]) : undefined;
  const episode = parts[2] ? parseInt(parts[2]) : undefined;

  console.log(`[DualSubs] VTT request: id=${id}`);

  try {
    const [spanishSrt, englishSrt] = await Promise.all([
      fetchSrt(imdbId, "es", season, episode),
      fetchSrt(imdbId, "en", season, episode),
    ]);

    console.log(
      `[DualSubs] Fetched: ES=${spanishSrt ? spanishSrt.length + " chars" : "null"}, EN=${englishSrt ? englishSrt.length + " chars" : "null"}`
    );

    if (!spanishSrt && !englishSrt) {
      res.statusCode = 404;
      res.end("No subtitles found");
      return;
    }

    let vtt;
    if (spanishSrt && englishSrt) vtt = mergeSrts(spanishSrt, englishSrt);
    else if (spanishSrt) vtt = mergeSrts(spanishSrt, "");
    else vtt = mergeSrts("", englishSrt);

    console.log(`[DualSubs] Merged VTT: ${vtt.length} chars`);

    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.end(vtt);
  } catch (err) {
    console.error("[DualSubs] VTT error:", err.message);
    res.statusCode = 500;
    res.end("Error building subtitles");
  }
};
