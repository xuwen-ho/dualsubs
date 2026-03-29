const SrtParser = require("srt-parser-2").default;

/**
 * Parse an SRT string into an array of cue objects.
 * Each cue: { startTime, endTime, startSeconds, endSeconds, text }
 */
function parseSrt(srtText) {
  const parser = new SrtParser();
  return parser.fromSrt(srtText);
}

/**
 * Convert "HH:MM:SS,mmm" or "HH:MM:SS.mmm" to total seconds.
 */
function timeToSeconds(t) {
  const normalized = t.replace(",", ".");
  const [h, m, rest] = normalized.split(":");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(rest);
}

/**
 * Convert total seconds to "HH:MM:SS.mmm" (VTT format).
 */
function secondsToVttTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    s.toFixed(3).padStart(6, "0")
  );
}

/**
 * Strip HTML tags from subtitle text.
 */
function stripTags(text) {
  return text.replace(/<[^>]+>/g, "");
}

/**
 * Merge two SRT strings into a single WebVTT string.
 * `topSrt` (Spanish) is positioned at the top of the screen.
 * `bottomSrt` (English) is positioned at the bottom (default).
 *
 * Strategy: create unified cue list sorted by start time.
 * Each cue carries a position tag so both can display simultaneously.
 */
function mergeSrts(topSrt, bottomSrt) {
  const topCues = parseSrt(topSrt);
  const bottomCues = parseSrt(bottomSrt);

  const allCues = [];

  for (const cue of topCues) {
    const start = timeToSeconds(cue.startTime);
    const end = timeToSeconds(cue.endTime);
    allCues.push({
      start,
      end,
      // VTT positioning: line:0% puts text at the top
      text: stripTags(cue.text),
      position: "top",
    });
  }

  for (const cue of bottomCues) {
    const start = timeToSeconds(cue.startTime);
    const end = timeToSeconds(cue.endTime);
    allCues.push({
      start,
      end,
      text: stripTags(cue.text),
      position: "bottom",
    });
  }

  // Sort by start time, then top before bottom for same timestamp
  allCues.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.position === "top" ? -1 : 1;
  });

  // Build the VTT output
  let vtt = "WEBVTT\n\n";

  for (let i = 0; i < allCues.length; i++) {
    const cue = allCues[i];
    const startStr = secondsToVttTime(cue.start);
    const endStr = secondsToVttTime(cue.end);

    // VTT positioning: line:5% = near top, line:90% = near bottom
    const positionTag =
      cue.position === "top" ? "line:5% align:center" : "line:90% align:center";

    vtt += `${i + 1}\n`;
    vtt += `${startStr} --> ${endStr} ${positionTag}\n`;
    vtt += `${cue.text}\n\n`;
  }

  return vtt;
}

module.exports = { mergeSrts };
