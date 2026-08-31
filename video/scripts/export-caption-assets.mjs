import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {beats} from '../src/storyboard.mjs';
import {chineseCaptions} from '../src/storyboard.zh.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(scriptDir, '..', 'public');
await mkdir(publicDir, {recursive: true});

const captions = beats.map((beat) => ({
  text: ` ${beat.caption}`,
  startMs: beat.start * 1000 + 220,
  endMs: beat.end * 1000 - 280,
  timestampMs: beat.start * 1000 + 220,
  confidence: 1,
  pageBreakAfter: true,
}));

if (chineseCaptions.length !== beats.length) {
  throw new Error(`Expected ${beats.length} Chinese captions, received ${chineseCaptions.length}`);
}

const chineseCaptionTrack = beats.map((beat, index) => ({
  text: ` ${chineseCaptions[index]}`,
  startMs: beat.start * 1000 + 220,
  endMs: beat.end * 1000 - 280,
  timestampMs: beat.start * 1000 + 220,
  confidence: 1,
  pageBreakAfter: true,
}));

const toSrtTime = (seconds) => {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const ms = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

const srt = beats
  .map(
    (beat, index) =>
      `${index + 1}\n${toSrtTime(beat.start + 0.22)} --> ${toSrtTime(beat.end - 0.28)}\n${beat.caption}\n`,
  )
  .join('\n');

const chineseSrt = beats
  .map(
    (beat, index) =>
      `${index + 1}\n${toSrtTime(beat.start + 0.22)} --> ${toSrtTime(beat.end - 0.28)}\n${chineseCaptions[index]}\n`,
  )
  .join('\n');

const voicePlan = beats.map((beat) => ({
  id: beat.id,
  start: beat.start,
  end: beat.end,
  narration: beat.narration,
}));

await Promise.all([
  writeFile(path.join(publicDir, 'captions.json'), `${JSON.stringify(captions, null, 2)}\n`),
  writeFile(path.join(publicDir, 'captions.en.srt'), srt),
  writeFile(path.join(publicDir, 'captions.zh-CN.json'), `${JSON.stringify(chineseCaptionTrack, null, 2)}\n`),
  writeFile(path.join(publicDir, 'captions.zh-CN.srt'), chineseSrt),
  writeFile(path.join(publicDir, 'voice-plan.json'), `${JSON.stringify(voicePlan, null, 2)}\n`),
]);

process.stdout.write(`Wrote captions and voice plan to ${publicDir}\n`);
