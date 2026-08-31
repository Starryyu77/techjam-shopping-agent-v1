import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {v3Segments, v3SubtitlePages} from '../src/v3/storyboard-v3.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, '..', 'public', 'v3');
await mkdir(outputDir, {recursive: true});

const asCaption = (page, language) => ({
  text: ` ${page[language]}`,
  startMs: page.start * 1000 + 180,
  endMs: page.end * 1000 - 180,
  timestampMs: page.start * 1000 + 180,
  confidence: 1,
  pageBreakAfter: true,
});

const english = v3SubtitlePages.map((page) => asCaption(page, 'en'));
const chinese = v3SubtitlePages.map((page) => asCaption(page, 'zh'));
const voicePlan = v3Segments.map(({id, start, end, narration}) => ({id, start, end, narration}));

const toSrtTime = (seconds) => {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const ms = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

const toSrt = (language) =>
  v3SubtitlePages
    .map(
      (page, index) =>
        `${index + 1}\n${toSrtTime(page.start + 0.18)} --> ${toSrtTime(page.end - 0.18)}\n${page[language]}\n`,
    )
    .join('\n');

const toVttTime = (seconds) => toSrtTime(seconds).replace(',', '.');

const toVtt = (language) =>
  `WEBVTT\n\n${v3SubtitlePages
    .map(
      (page) =>
        `${toVttTime(page.start + 0.18)} --> ${toVttTime(page.end - 0.18)}\n${page[language]}\n`,
    )
    .join('\n')}`;

await Promise.all([
  writeFile(path.join(outputDir, 'voice-plan.json'), `${JSON.stringify(voicePlan, null, 2)}\n`),
  writeFile(path.join(outputDir, 'captions.en.json'), `${JSON.stringify(english, null, 2)}\n`),
  writeFile(path.join(outputDir, 'captions.zh-CN.json'), `${JSON.stringify(chinese, null, 2)}\n`),
  writeFile(path.join(outputDir, 'captions.en.srt'), toSrt('en')),
  writeFile(path.join(outputDir, 'captions.zh-CN.srt'), toSrt('zh')),
  writeFile(path.join(outputDir, 'captions.en.vtt'), toVtt('en')),
  writeFile(path.join(outputDir, 'captions.zh-CN.vtt'), toVtt('zh')),
]);

process.stdout.write(`Wrote V3 voice and caption assets to ${outputDir}\n`);
