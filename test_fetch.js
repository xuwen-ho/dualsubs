const { fetchSrt } = require('./lib/opensubtitles');

async function test() {
  console.log("Testing index 0...");
  const srt0 = await fetchSrt('tt30144839', 'en', undefined, undefined, 0);
  console.log("Length 0:", srt0 ? srt0.length : 'null');
  
  console.log("Testing index 1...");
  const srt1 = await fetchSrt('tt30144839', 'en', undefined, undefined, 1);
  console.log("Length 1:", srt1 ? srt1.length : 'null');
}

test().catch(console.error);
