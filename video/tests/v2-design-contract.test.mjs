import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cameraKeyframes,
  alignmentLocks,
  chapterHandoffs,
  environments,
  safeArea,
  sharedTokenJourney,
  bilingualSubtitleStyle,
  subtitleStyle,
  visualCues,
} from '../src/v2/design.mjs';

test('V2 uses multiple visual environments without violet AI-template styling', () => {
  assert.ok(environments.length >= 5);
  assert.equal(new Set(environments.map((environment) => environment.name)).size, environments.length);
  const palette = environments.flatMap((environment) => environment.palette).join(' ').toLowerCase();
  assert.doesNotMatch(palette, /violet|purple|#bc8cff|#8b5cf6/);
});

test('camera motion is continuous and never resets every five seconds', () => {
  assert.ok(cameraKeyframes.length >= 9);
  assert.equal(cameraKeyframes[0].second, 0);
  assert.equal(cameraKeyframes.at(-1).second, 180);
  for (let index = 1; index < cameraKeyframes.length; index += 1) {
    assert.ok(cameraKeyframes[index].second > cameraKeyframes[index - 1].second);
  }
  assert.ok(cameraKeyframes.some((keyframe) => keyframe.second % 5 !== 0));
});

test('the shared state token crosses conversation, retrieval, ranking, and evidence', () => {
  assert.deepEqual(
    sharedTokenJourney.map((step) => step.world),
    ['conversation', 'state', 'retrieval', 'ranking', 'evidence'],
  );
  assert.equal(sharedTokenJourney[0].second, 52);
  assert.ok(sharedTokenJourney.at(-1).second >= 145);
});

test('override actions are positioned after narration starts and in evidence order', () => {
  assert.deepEqual(
    visualCues.filter((cue) => cue.group === 'override').map((cue) => cue.id),
    ['override-message', 'show-superseded', 'erase-adjustable', 'add-polyester', 'rank-one'],
  );
  const cueMap = Object.fromEntries(visualCues.map((cue) => [cue.id, cue.second]));
  assert.ok(cueMap['override-message'] >= 75.45 && cueMap['override-message'] < 80);
  assert.ok(cueMap['erase-adjustable'] >= 90.45 && cueMap['erase-adjustable'] < 94);
  assert.ok(cueMap['add-polyester'] >= 95.45 && cueMap['add-polyester'] < 99);
  assert.ok(cueMap['rank-one'] >= 100.45 && cueMap['rank-one'] < 104);
});

test('caption rail and evidence field stay in safe areas', () => {
  assert.ok(safeArea.captionTop >= 908);
  assert.ok(safeArea.captionBottom <= 1004);
  assert.ok(safeArea.contentBottom <= 874);
  assert.equal(safeArea.evidenceDotCount, 200);
});

test('V2 locks token, score, chapter, and closeout alignment', () => {
  assert.deepEqual(alignmentLocks.stateToken, {x: 960, y: 320});
  assert.ok(alignmentLocks.scoreFinalBy <= 151.5);
  assert.ok(alignmentLocks.evidenceClearBy <= 162.5);
  assert.ok(alignmentLocks.closeoutStartsAt >= 174.5);
  assert.ok(alignmentLocks.decisionClearBy <= 171.2);
  assert.ok(alignmentLocks.commercialSoloBy <= 172);
  assert.ok(alignmentLocks.decisionVisualIn >= 160.5);
  assert.ok(alignmentLocks.commercialAllIn >= 170.5);
  assert.deepEqual(alignmentLocks.brandBugHiddenWindow, [147, 160]);
});

test('chapter titles hand off without visible double-heading overlap', () => {
  chapterHandoffs.forEach((handoff) => {
    assert.ok(handoff.nextTitleIn >= handoff.previousTitleOut - 0.2, handoff.id);
    assert.ok(handoff.backgroundOverlap <= 2.5, handoff.id);
  });
});

test('final subtitles are prominent, burned in, and safe for YouTube', () => {
  assert.equal(subtitleStyle.language, 'en');
  assert.equal(subtitleStyle.align, 'center');
  assert.ok(subtitleStyle.fontSize >= 36);
  assert.equal(subtitleStyle.maxLines, 2);
  assert.ok(subtitleStyle.backgroundAlpha >= 0.68);
  assert.equal(subtitleStyle.burnedIn, true);
  assert.equal(subtitleStyle.sidecarSrt, true);

  assert.deepEqual(bilingualSubtitleStyle.languages, ['en', 'zh-CN']);
  assert.ok(bilingualSubtitleStyle.englishFontSize >= 32);
  assert.ok(bilingualSubtitleStyle.chineseFontSize >= 26);
  assert.ok(bilingualSubtitleStyle.backgroundAlpha >= 0.76);
  assert.equal(bilingualSubtitleStyle.maxLinesPerLanguage, 2);
  assert.equal(bilingualSubtitleStyle.showKicker, false);
  assert.equal(bilingualSubtitleStyle.burnedIn, true);
  assert.equal(bilingualSubtitleStyle.sidecarSrt, true);
});
