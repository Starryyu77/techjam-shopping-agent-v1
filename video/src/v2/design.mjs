export const environments = [
  {
    name: 'conversation-light',
    start: 0,
    end: 34,
    palette: ['#0b0c0e', '#f4efe6', '#ffb454', '#e2ddd4'],
  },
  {
    name: 'catalog-depth',
    start: 28,
    end: 52,
    palette: ['#071011', '#5be0b3', '#a8f0d8', '#13282a'],
  },
  {
    name: 'product-stage',
    start: 45,
    end: 112,
    palette: ['#0c1014', '#f1eee7', '#69a8ff', '#ffb454'],
  },
  {
    name: 'retrieval-tunnel',
    start: 108,
    end: 138,
    palette: ['#061012', '#41d6bd', '#7fbfff', '#d8fff5'],
  },
  {
    name: 'evidence-field',
    start: 132,
    end: 164,
    palette: ['#08110e', '#4fe09d', '#e9f7ef', '#ffb454'],
  },
  {
    name: 'experiment-branch',
    start: 158,
    end: 174,
    palette: ['#130a0c', '#ff6673', '#f2eee7', '#8d303c'],
  },
  {
    name: 'closeout',
    start: 170,
    end: 180,
    palette: ['#f2eee6', '#111418', '#009f6b', '#c9852f'],
  },
];

export const cameraKeyframes = [
  {second: 0, x: -140, y: 40, z: 0, rotate: -2},
  {second: 8, x: 40, y: -30, z: 70, rotate: 1},
  {second: 22, x: -30, y: 10, z: 140, rotate: 0},
  {second: 38, x: 180, y: -80, z: 250, rotate: 4},
  {second: 47, x: -210, y: 40, z: 170, rotate: -4},
  {second: 64, x: 60, y: -20, z: 330, rotate: 2},
  {second: 82, x: -80, y: 0, z: 430, rotate: -1},
  {second: 104, x: 120, y: -40, z: 520, rotate: 3},
  {second: 116, x: -120, y: 30, z: 650, rotate: -3},
  {second: 132, x: 90, y: -60, z: 780, rotate: 2},
  {second: 149, x: -20, y: 10, z: 910, rotate: 0},
  {second: 163, x: 160, y: -30, z: 1030, rotate: 4},
  {second: 174, x: -60, y: 40, z: 1120, rotate: -2},
  {second: 180, x: 0, y: 0, z: 1200, rotate: 0},
];

export const sharedTokenJourney = [
  {world: 'conversation', second: 52, label: 'adjustable'},
  {world: 'state', second: 61, label: 'adjustable'},
  {world: 'retrieval', second: 118, label: 'polyester'},
  {world: 'ranking', second: 139, label: 'candidate signal'},
  {world: 'evidence', second: 147, label: 'verified target'},
];

export const visualCues = [
  {id: 'first-message', group: 'trace', second: 50.6},
  {id: 'route-item', group: 'trace', second: 55.65},
  {id: 'add-adjustable', group: 'trace', second: 60.65},
  {id: 'clarify-size', group: 'trace', second: 65.65},
  {id: 'target-miss', group: 'trace', second: 70.65},
  {id: 'override-message', group: 'override', second: 75.65},
  {id: 'show-superseded', group: 'override', second: 85.65},
  {id: 'erase-adjustable', group: 'override', second: 90.7},
  {id: 'add-polyester', group: 'override', second: 95.7},
  {id: 'rank-one', group: 'override', second: 100.7},
  {id: 'retrieval-entry', group: 'mechanism', second: 115.65},
  {id: 'candidate-compress', group: 'mechanism', second: 125.65},
  {id: 'evidence-field', group: 'evidence', second: 135.65},
  {id: 'metrics-lock', group: 'evidence', second: 150.65},
];

export const safeArea = {
  contentTop: 78,
  contentBottom: 866,
  captionTop: 920,
  captionBottom: 996,
  evidenceDotCount: 200,
};

export const alignmentLocks = {
  stateToken: {x: 960, y: 320},
  scoreFinalBy: 151.5,
  evidenceClearBy: 162.5,
  closeoutStartsAt: 174.5,
  decisionClearBy: 171.2,
  commercialSoloBy: 172,
  decisionVisualIn: 160.5,
  commercialAllIn: 170.5,
  brandBugHiddenWindow: [147, 160],
};

export const chapterHandoffs = [
  {id: 'opening-catalog', previousTitleOut: 30.5, nextTitleIn: 31.0, backgroundOverlap: 2.0},
  {id: 'catalog-product', previousTitleOut: 45.0, nextTitleIn: 45.2, backgroundOverlap: 1.8},
  {id: 'product-retrieval', previousTitleOut: 111.0, nextTitleIn: 111.4, backgroundOverlap: 2.2},
  {id: 'retrieval-evidence', previousTitleOut: 136.2, nextTitleIn: 136.4, backgroundOverlap: 2.0},
  {id: 'evidence-decision', previousTitleOut: 160.8, nextTitleIn: 160.7, backgroundOverlap: 1.6},
  {id: 'decision-commercial', previousTitleOut: 170.7, nextTitleIn: 170.5, backgroundOverlap: 1.2},
];

export const subtitleStyle = {
  language: 'en',
  align: 'center',
  fontSize: 38,
  maxLines: 2,
  backgroundAlpha: 0.76,
  burnedIn: true,
  sidecarSrt: true,
};

export const bilingualSubtitleStyle = {
  languages: ['en', 'zh-CN'],
  align: 'center',
  englishFontSize: 32,
  chineseFontSize: 27,
  maxLinesPerLanguage: 2,
  backgroundAlpha: 0.8,
  showKicker: false,
  burnedIn: true,
  sidecarSrt: true,
};
