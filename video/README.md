# Shopping Copilot Cinematic Product Film

A deterministic 180-second Remotion composition for the TikTok TechJam 2026
Track 4 submission video. It is intentionally isolated from the scored agent and
reads only a frozen projection of the repository's public evidence artifacts.

## Recommended submission film (V3 · editorial social commerce)

`out/shopping-copilot-v3-final.mp4`

- 1920x1080, 30fps, H.264 High, BT.709, yuv420p
- AAC stereo, 48kHz, -16.1 LUFS
- English British-female neural voice (`en-GB-SoniaNeural`, `edge-tts==7.2.8`)
- Burned-in English / Chinese subtitles plus V3 sidecar SRT files
- Exactly 18 ten-second narration segments, 36 five-second visual / subtitle beats, and 180 seconds
- Bright serif editorial system with ecommerce phone UI, photorealistic AI-generated product imagery, retrieval, override, ranking, and transparent-ad scenes
- Original procedural score, 108 BPM, no third-party recording or sample
- Full-film SHA-256: `880154c99ebb5a24c557f603eb116658964f24d6349874374b2879f662be7fac`

The earlier V2 versions remain available locally for A/B review:

The original V1 remains available for direct A/B review:

`out/shopping-copilot-cinematic-preview.mp4`

The lower-profile V2 caption treatment remains available as:

`out/shopping-copilot-cinematic-v2-preview.mp4`

## Reproduce

```bash
cd video
npm install
npm test
npm run sync:evidence
node scripts/export-caption-assets.mjs
npm run export:v3

python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-voice.txt
.venv/bin/python scripts/generate-voice.py
npm run voice:v3
npm run music:v3

npm run render
npm run render:v2
npm run render:v2:subtitled
npm run render:v3
npm run release:v3
```

The `npm run render` output is the Remotion master. The review preview applies a
final BT.709 and loudness-normalization pass:

```bash
ffmpeg -y -hide_banner \
  -i out/shopping-copilot-v3-master.mp4 \
  -t 180 \
  -map 0:v:0 -map 0:a:0 \
  -vf "format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -profile:v high -level 4.2 \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=7" -ar 48000 \
  -c:a aac -b:a 160k -movflags +faststart \
out/shopping-copilot-v3-final.mp4
```

`npm run release:v3` is the end-to-end release command. It regenerates captions,
voice, original music, the Remotion master, the 1080p final, the sub-25-MiB 720p
Cloudflare encode, poster, GIF preview, SRT / WebVTT sidecars, and release hashes.
Use `npm run release:v3:package` to rebuild only the distribution package from an
already verified `out/shopping-copilot-v3-final.mp4`.

## Evidence boundary

- Verified: official public-set evaluator, 200 sessions.
- Unknown: private 800-session performance.
- Commercial sponsored-placement sequence: explicitly demo-only simulation.
- Product-scene backgrounds are generated visual assets; exact copy and evidence values are deterministic overlays.
- Background music is project-owned procedural audio with no third-party recording or sample.
- No hidden labels or private-set claims.

## Preview voice boundary

The voice is generated through the remote Microsoft Edge Read Aloud service via
`edge-tts`. The service can drift, so the final WAV, voice-plan hash, output hash,
tool version, and usage boundary are frozen in `public/v3/audio/voice-report.json`.
Verify upstream service terms before unrelated reuse.
