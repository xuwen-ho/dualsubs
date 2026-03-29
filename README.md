# Dual Subtitles Stremio Addon

A Stremio addon that fetches Spanish and English subtitles from OpenSubtitles, merges them into a single dual-language track, and delivers them to Stremio. Spanish appears at the top of the screen, English at the bottom.

## Setup

### 1. Get an OpenSubtitles API Key

Sign up at [opensubtitles.com/consumers](https://www.opensubtitles.com/consumers) and create a free API key.

### 2. Deploy to Vercel

```bash
npm install -g vercel
git clone <this-repo>
cd dualsubs
npm install
vercel --prod
```

Set the environment variable in Vercel:
```
vercel env add OPENSUBTITLES_API_KEY
```

### 3. Install in Stremio

Open Stremio, go to **Addons**, and paste:
```
https://your-app.vercel.app/manifest.json
```

### Local Development

```bash
cp .env.example .env
# Edit .env with your API key
npm install
npm start
```

Then install in Stremio using `http://localhost:7000/manifest.json`.

## How It Works

1. Stremio requests subtitles for a movie/series by IMDB ID
2. The addon fetches English and Spanish SRT files from OpenSubtitles in parallel
3. Both SRTs are parsed, merged into a single WebVTT file with positioning (Spanish top, English bottom)
4. The VTT is base64-encoded and returned to Stremio as a data URL
