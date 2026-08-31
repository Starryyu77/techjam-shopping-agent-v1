import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BEAT_SECONDS,
  DURATION_FRAMES,
  DURATION_SECONDS,
  FPS,
  beats,
  evidence,
} from '../src/storyboard.mjs';

test('the film is exactly 36 contiguous five-second beats', () => {
  assert.equal(FPS, 30);
  assert.equal(BEAT_SECONDS, 5);
  assert.equal(DURATION_SECONDS, 180);
  assert.equal(DURATION_FRAMES, 5400);
  assert.equal(beats.length, 36);

  beats.forEach((beat, index) => {
    assert.equal(beat.start, index * BEAT_SECONDS);
    assert.equal(beat.end, (index + 1) * BEAT_SECONDS);
    assert.ok(beat.caption.length > 0);
  });
});

test('all numerical claims match the frozen public evidence contract', () => {
  assert.equal(evidence.scope, 'official_public_200');
  assert.equal(evidence.sampleCount, 200);
  assert.equal(evidence.privateSessions, 800);
  assert.equal(evidence.metrics.hitRateAt10, 0.995);
  assert.equal(evidence.metrics.mrr, 0.644355);
  assert.equal(evidence.metrics.mttc, 2.215);
  assert.equal(evidence.metrics.technicalScore, 0.866507);
  assert.equal(evidence.starter.technicalScore, 0.10671);
});

test('the primary override story uses the owner-approved public trace', () => {
  assert.equal(evidence.override.sampleId, 'public_0004');
  assert.equal(evidence.override.before, 'adjustable');
  assert.equal(evidence.override.after, 'polyester');
  assert.equal(evidence.override.finalRank, 1);
});

test('the storyboard keeps claim and commercial boundaries explicit', () => {
  const text = beats.map((beat) => `${beat.caption} ${beat.screenText}`).join(' ');
  assert.match(text, /private.*unknown/i);
  assert.match(text, /public-set/i);
  assert.match(text, /demo-only simulation/i);
  assert.doesNotMatch(text, /hidden-set score|final competition score/i);
});
