import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

const readWav = async (relativePath) => {
  const buffer = await readFile(new URL(relativePath, import.meta.url));
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
  let offset = 12;
  let format;
  let dataOffset;
  let dataSize;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      format = {
        channels: buffer.readUInt16LE(offset + 10),
        sampleRate: buffer.readUInt32LE(offset + 12),
        bitsPerSample: buffer.readUInt16LE(offset + 22),
      };
    }
    if (id === 'data') {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  assert.ok(format);
  assert.ok(dataOffset);
  assert.ok(dataSize);
  const bytesPerFrame = format.channels * (format.bitsPerSample / 8);
  return {buffer, dataOffset, dataSize, frames: dataSize / bytesPerFrame, ...format};
};

test('V3 narration and music are exact 180-second 48kHz stereo PCM assets', async () => {
  for (const path of ['../public/v3/audio/narration.wav', '../public/v3/audio/music.wav']) {
    const wav = await readWav(path);
    assert.equal(wav.channels, 2);
    assert.equal(wav.sampleRate, 48000);
    assert.equal(wav.bitsPerSample, 16);
    assert.equal(wav.frames, 8_640_000);
  }
});

test('V3 voice report enforces all eighteen segments below the audible compression gate', async () => {
  const report = JSON.parse(await readFile(new URL('../public/v3/audio/voice-report.json', import.meta.url), 'utf8'));
  const narration = await readFile(new URL('../public/v3/audio/narration.wav', import.meta.url));
  assert.equal(report.segments.length, 18);
  assert.ok(Math.max(...report.segments.map((segment) => segment.speed)) <= 1.15);
  assert.match(report.voicePlanSha256, /^[a-f0-9]{64}$/);
  assert.match(report.outputSha256, /^[a-f0-9]{64}$/);
  assert.equal(report.outputSha256, sha256(narration));
  assert.match(report.edgeTtsVersion, /^\d+\.\d+\.\d+/);
});

test('V3 procedural music has no hard sample jumps at ten-second chord boundaries', async () => {
  const wav = await readWav('../public/v3/audio/music.wav');
  const manifest = JSON.parse(await readFile(new URL('../public/v3/audio/music-manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.outputSha256, sha256(wav.buffer));
  const deltas = [];
  for (let second = 10; second < 180; second += 10) {
    const frame = second * wav.sampleRate;
    const previous = wav.buffer.readInt16LE(wav.dataOffset + (frame - 1) * 4) / 32768;
    const current = wav.buffer.readInt16LE(wav.dataOffset + frame * 4) / 32768;
    deltas.push(Math.abs(current - previous));
  }
  assert.ok(Math.max(...deltas) < 0.025, `maximum boundary delta was ${Math.max(...deltas)}`);
});
