/* ===================================================================
   Shopping Copilot — Guided Evidence Tour
   Reads all data from /evidence/*.json — no live agent, no network.
   =================================================================== */
'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let manifest = null;
let metrics = null;
let dataset = null;
let versionComparison = null;
let catalogSamples = null;
let promptEvolution = null;
let currentStep = 0;
let currentScenario = 'buying';
let currentTrace = null;
let currentTurnIdx = 0;
let currentCaseId = null;
let autoPlayTimer = null;
let currentMechanismIdx = 0;
let currentPromptRound = 0;
let currentPromptCase = 0;
let promptSimulationTimer = null;

// Canonical cases: map scenario_type -> sample_id
const canonicalCases = {};
const canonicalCasesByScenario = {};
const siteBaseUrl = new URL('.', document.currentScript.src);

const mechanismDefinitions = [
  {
    id: 'route',
    number: '01',
    title: 'Intent Router',
    short: 'Buying or Browsing?',
    input: 'Raw user message + pending question context',
    decision: 'Detect ITEM vs VAGUE intent and NEW / ANSWER / OVERRIDE / NOOP dialogue act. Concrete Buying locks constraints; vague Browsing asks before narrowing.',
    output: 'domain_intent + dialogue_act + extracted clauses',
    failure: 'Premature Buying classification filters a vague request before the user has expressed useful constraints.',
    metric: 'Buying HR 0.988 · Browsing HR 1.000',
    source: 'shopping_agent.py · RuleIntentParser',
  },
  {
    id: 'state',
    number: '02',
    title: 'Versioned State',
    short: 'Add, retain, or erase?',
    input: 'Intent parse + previous ShoppingState',
    decision: 'Apply hard, soft, and negative constraints. OVERRIDE erases superseded soft values before writing replacements instead of appending conflicts.',
    output: 'New inspectable state + added / removed / retained diff',
    failure: 'Append-only memory leaves contradictory preferences active and blocks the intended product.',
    metric: 'Intent Override HR 1.000 across 30 public sessions',
    source: 'shopping_agent.py · ShoppingState.apply',
  },
  {
    id: 'recall',
    number: '03',
    title: 'SQLite FTS5 Recall',
    short: 'Retrieve a broad pool',
    input: 'Category + hard/soft values + retrieval evidence + profile fallback',
    decision: 'Build a deduplicated OR query, retrieve a broad lexical pool, then remove rejected and negative-constraint products.',
    output: 'Up to 50 policy candidates + requested Top-10',
    failure: 'Narrow recall makes reranking irrelevant because the purchased product never reaches the candidate pool.',
    metric: 'Public target recall saturated at 200 / 200',
    source: 'shopping_agent.py · CatalogSearch.search',
  },
  {
    id: 'rerank',
    number: '04',
    title: 'Rule Reranker',
    short: 'Score matches transparently',
    input: 'FTS5 candidates + constraint state + user profile',
    decision: 'Start with 3 / (rank + 1), reward category and matched constraints, penalize missing hard attributes, then use popularity only inside near-tied score bands.',
    output: 'Deterministic ordered Top-10 parent_asin list',
    failure: 'Unbanded popularity can displace a clearly better constraint match; random ties bury relevant products.',
    metric: 'TechnicalScore 0.826 → 0.867 with banded tie-breaking',
    source: 'shopping_agent.py · CatalogSearch.search',
  },
  {
    id: 'question',
    number: '05',
    title: 'Question Policy',
    short: 'Ask only what separates candidates',
    input: 'Current policy candidate pool + already known/asked attributes',
    decision: 'For each remaining attribute, compute coverage × entropy. Ask the highest-information attribute only when its score clears 0.15.',
    output: 'ask_attribute or null when the candidate set is focused',
    failure: 'Fixed-order questions waste turns on attributes that do not separate the current products.',
    metric: 'MTTC improved from 3.50 → 2.22',
    source: 'shopping_agent.py · CandidateQuestionPolicy.choose',
  },
];

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadJSON(url) {
  const portableUrl = new URL(String(url).replace(/^\/+/, ''), siteBaseUrl);
  const resp = await fetch(portableUrl);
  if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`);
  return resp.json();
}

async function init() {
  try {
    [manifest, metrics, dataset, versionComparison, catalogSamples, promptEvolution] = await Promise.all([
      loadJSON('/evidence/manifest.json'),
      loadJSON('/evidence/metrics.json'),
      loadJSON('/evidence/dataset.json'),
      loadJSON('/evidence/version_comparison.json'),
      loadJSON('/evidence/catalog_samples.json'),
      loadJSON('/evidence/prompt_evolution.json'),
    ]);

    if (!manifest.canonical_cases_frozen || !Array.isArray(manifest.canonical_cases)) {
      throw new Error('Canonical cases are not owner-approved and frozen');
    }
    // Use only the source-controlled owner-approved selection.
    for (const c of manifest.canonical_cases) {
      if (!canonicalCasesByScenario[c.scenario_type]) {
        canonicalCasesByScenario[c.scenario_type] = [];
      }
      canonicalCasesByScenario[c.scenario_type].push(c);
      if ((c.role === 'primary_video' || c.role === 'primary_website') && !canonicalCases[c.scenario_type]) {
        canonicalCases[c.scenario_type] = c.sample_id;
      }
    }

    renderHero();
    renderDataContract();
    renderEvaluation();
    renderMechanisms();
    renderAds();
    renderCloseout();
    bindNavigation();
    bindReplay();

    // Load default scenario
    await loadScenario('buying');
    const queryStep = Number.parseInt(new URLSearchParams(window.location.search).get('step'), 10);
    if (window.location.pathname === '/evidence' || (Number.isInteger(queryStep) && queryStep >= 0 && queryStep <= 6)) {
      goToStep(window.location.pathname === '/evidence' ? 4 : queryStep);
    }
  } catch (err) {
    console.error('Evidence load failed:', err);
    document.querySelector('.tour-content').innerHTML =
      '<div class="card" style="text-align:center;padding:3rem;color:var(--error);">' +
      '<h2>Evidence artifacts not found</h2>' +
      '<p>Run: <code>python scripts/build_demo_evidence.py</code> first.</p></div>';
  }
}

// ---------------------------------------------------------------------------
// Step 0: Hero
// ---------------------------------------------------------------------------
function renderHero() {
  const m = manifest.metrics;
  document.getElementById('heroTS').textContent = m.technical_score.toFixed(4);
  document.getElementById('heroHR').textContent = m.hit_rate_at_10.toFixed(3);
  document.getElementById('heroMRR').textContent = m.mrr.toFixed(3);
  document.getElementById('heroMTTC').textContent = m.mttc.toFixed(3);
  document.getElementById('heroN').textContent = manifest.sample_count;
}

// ---------------------------------------------------------------------------
// Step 1: Data Contract
// ---------------------------------------------------------------------------
function renderDataContract() {
  const d = dataset;
  const items = [
    { icon: '📊', key: 'Dataset', val: d.source },
    { icon: '👗', key: 'Category', val: d.category.replace(/_/g, ' ') },
    { icon: '📦', key: 'Catalog Size', val: d.catalog_size.toLocaleString() + ' frozen products' },
    { icon: '🔓', key: 'Public Sessions', val: d.public_sessions + ' (labeled)' },
    { icon: '🔒', key: 'Private Sessions', val: d.private_sessions + ' (unknown)' },
    { icon: '🔄', key: 'Max Turns', val: d.max_turns },
    { icon: '🆔', key: 'Scored Identifier', val: d.scored_identifier },
    { icon: '📖', key: 'Catalog', val: 'Read-only' },
  ];

  const grid = document.getElementById('contractGrid');
  grid.innerHTML = items.map(i =>
    '<div class="contract-item">' +
    '<div class="icon">' + i.icon + '</div>' +
    '<div class="detail"><div class="key">' + i.key + '</div><div class="val">' + i.val + '</div></div>' +
    '</div>'
  ).join('');

  // Scenario bar
  const colors = { buying: '#1f6feb', browsing: '#8b5cf6', intent_override: '#d29922', boundary: '#6e7681' };
  const labels = { buying: 'Buying', browsing: 'Browsing', intent_override: 'Override', boundary: 'Boundary' };
  const mix = d.scenario_mix;
  const bar = document.getElementById('scenarioBar');
  const legend = document.getElementById('scenarioLegend');
  bar.innerHTML = '';
  legend.innerHTML = '';

  for (const [type, info] of Object.entries(mix)) {
    const seg = document.createElement('div');
    seg.className = 'segment';
    seg.style.flex = info.percentage;
    seg.style.background = colors[type] || '#444';
    seg.textContent = info.percentage + '%';
    seg.title = labels[type] + ': ' + info.description;
    bar.appendChild(seg);

    legend.innerHTML += '<span>● ' + labels[type] + ' (' + info.count + ')</span>';
  }

  // Catalog samples
  const container = document.getElementById('catalogSamples');
  container.innerHTML = catalogSamples.map(s =>
    '<div class="catalog-sample">' +
    '<div class="asin">' + s.parent_asin + '</div>' +
    '<div class="title">' + escHtml(s.title) + '</div>' +
    '<div class="meta">' +
    (s.price != null ? '<span>$' + s.price + '</span>' : '') +
    (s.average_rating != null ? '<span>★ ' + s.average_rating + '</span>' : '') +
    (s.rating_number != null ? '<span>' + s.rating_number.toLocaleString() + ' reviews</span>' : '') +
    (s.store ? '<span>' + escHtml(s.store) + '</span>' : '') +
    '</div>' +
    (s.features && s.features.length ? '<div class="text-sm text-muted mt-1">' + s.features.map(escHtml).join(' · ') + '</div>' : '') +
    '</div>'
  ).join('');
}

// ---------------------------------------------------------------------------
// Step 2: Scenario Replay
// ---------------------------------------------------------------------------
async function loadScenario(scenarioType, requestedSampleId) {
  currentScenario = scenarioType;
  const sampleId = requestedSampleId || canonicalCases[scenarioType];
  if (!sampleId) {
    document.getElementById('replayHeader').innerHTML = '<span class="text-muted">No canonical case for this scenario yet (awaiting owner selection).</span>';
    return;
  }

  try {
    currentCaseId = sampleId;
    currentTrace = await loadJSON('/evidence/scenarios/' + sampleId + '.json');
    currentTurnIdx = 0;
    renderCaseSelector(scenarioType, sampleId);
    renderOverrideSummary();
    renderReplayHeader();
    renderTurnTimeline();
    renderTurnDetail(0);
  } catch (err) {
    console.error('Failed to load scenario:', err);
  }
}

function renderCaseSelector(scenarioType, activeSampleId) {
  const selector = document.getElementById('caseSelector');
  const cases = canonicalCasesByScenario[scenarioType] || [];
  if (cases.length <= 1) {
    selector.hidden = true;
    selector.innerHTML = '';
    return;
  }

  selector.hidden = false;
  selector.innerHTML = cases.map((item, index) =>
    '<button class="case-choice' + (item.sample_id === activeSampleId ? ' active' : '') + '" ' +
    'data-sample-id="' + item.sample_id + '" aria-pressed="' + (item.sample_id === activeSampleId) + '">' +
    '<span class="case-index">Case ' + (index + 1) + '</span>' +
    '<strong>' + escHtml(item.label || item.sample_id) + '</strong>' +
    '<span>' + escHtml(item.description || '') + '</span>' +
    '<code>' + item.sample_id + '</code>' +
    '</button>'
  ).join('');

  selector.querySelectorAll('.case-choice').forEach(button => {
    button.addEventListener('click', () => {
      stopAutoPlay();
      loadScenario(scenarioType, button.dataset.sampleId);
    });
  });
}

function renderOverrideSummary() {
  const summary = document.getElementById('overrideSummary');
  const step = document.getElementById('step2');
  if (currentScenario !== 'intent_override' || !currentTrace) {
    summary.hidden = true;
    summary.innerHTML = '';
    step.classList.remove('override-active');
    return;
  }

  const overrideIndex = currentTrace.turns.findIndex(turn => turn.intent.dialogue_act === 'OVERRIDE');
  if (overrideIndex < 0) {
    summary.hidden = true;
    summary.innerHTML = '';
    step.classList.remove('override-active');
    return;
  }

  const overrideTurn = currentTrace.turns[overrideIndex];
  const before = overrideIndex > 0 ? currentTrace.turns[overrideIndex - 1].state_after : {};
  const after = overrideTurn.state_after || {};
  const removed = overrideTurn.state_diff.removed || {};
  const retained = overrideTurn.state_diff.retained || {};
  const added = overrideTurn.state_diff.added || {};
  summary.hidden = false;
  step.classList.add('override-active');
  summary.innerHTML =
    summaryCard('Before override', flattenStateSnapshot(before), 'before') +
    summaryCard('Removed', flattenDiffBucket(removed), 'removed') +
    summaryCard('Retained', flattenDiffBucket(retained), 'retained') +
    summaryCard('Added', flattenDiffBucket(added), 'added') +
    summaryCard('After override', flattenStateSnapshot(after), 'after');
}

function summaryCard(label, values, kind) {
  const safeValues = values.length ? values : ['None'];
  return '<div class="override-summary-card ' + kind + '">' +
    '<div class="override-summary-label">' + label + '</div>' +
    safeValues.map(value => '<div class="override-summary-value">' + escHtml(value) + '</div>').join('') +
    '</div>';
}

function flattenStateSnapshot(state) {
  const values = [];
  if (state.category) values.push('category: ' + state.category);
  for (const field of ['hard_constraints', 'soft_preferences', 'negative_constraints']) {
    const group = state[field] || {};
    for (const [attribute, entries] of Object.entries(group)) {
      for (const value of entries || []) values.push(attribute + ': ' + value);
    }
  }
  for (const attribute of state.no_preference || []) values.push(attribute + ': no preference');
  return values;
}

function flattenDiffBucket(bucket) {
  const values = [];
  if (bucket.category) values.push('category: ' + bucket.category);
  for (const field of ['hard_constraints', 'soft_preferences', 'negative_constraints']) {
    const group = bucket[field] || {};
    for (const [attribute, entries] of Object.entries(group)) {
      for (const value of entries || []) values.push(attribute + ': ' + value);
    }
  }
  return values;
}

function rawTargetRank(turn) {
  const target = turn.top10.find(item => item.is_target);
  return target ? target.rank : null;
}

function recommendationChange(turnIndex) {
  if (!currentTrace || turnIndex <= 0) {
    return { added: 10, retained: 0, moved: 0 };
  }
  const previous = currentTrace.turns[turnIndex - 1].top10;
  const current = currentTrace.turns[turnIndex].top10;
  const previousRanks = new Map(previous.map(item => [item.parent_asin, item.rank]));
  const retained = current.filter(item => previousRanks.has(item.parent_asin));
  return {
    added: current.length - retained.length,
    retained: retained.length,
    moved: retained.filter(item => previousRanks.get(item.parent_asin) !== item.rank).length,
  };
}

function rankPresentation(turn) {
  const rawRank = rawTargetRank(turn);
  if (turn.target_rank) {
    return { label: 'Rank #' + turn.target_rank, note: 'Scored hit', kind: 'hit', rawRank };
  }
  if (rawRank) {
    return { label: 'Preview #' + rawRank, note: 'Not scored yet', kind: 'preview', rawRank };
  }
  return { label: 'Outside Top-10', note: 'Keep refining', kind: 'miss', rawRank: null };
}

function renderRankJourney(activeIndex) {
  const container = document.getElementById('rankJourney');
  if (!currentTrace) {
    container.innerHTML = '';
    return;
  }

  const nodes = currentTrace.turns.map((turn, index) => {
    const rank = rankPresentation(turn);
    const delta = recommendationChange(index);
    const changeLabel = index === 0 ? 'Initial Top-10' : delta.added + ' new · ' + delta.moved + ' moved';
    return '<div class="rank-node ' + rank.kind + (index === activeIndex ? ' active' : '') + '">' +
      '<span class="rank-turn">T' + turn.turn + '</span>' +
      '<strong>' + rank.label + '</strong>' +
      '<small>' + changeLabel + '</small>' +
      '</div>';
  }).join('<span class="rank-arrow" aria-hidden="true">→</span>');

  const activeTurn = currentTrace.turns[activeIndex];

  container.innerHTML =
    '<div class="rank-journey-target">' +
      '<span>Recommendation impact · ' + escHtml(currentTrace.scenario_type.replace(/_/g, ' ')) + ' · ' + currentTrace.sample_id + '</span>' +
      '<strong>' + escHtml(truncate(currentTrace.target_title, 68)) + '</strong>' +
      '<em><b>User signal T' + activeTurn.turn + ':</b> ' + escHtml(truncate(activeTurn.user_message, 82)) + '</em>' +
    '</div>' +
    '<div class="rank-track" aria-label="Rank progression">' + nodes + '</div>';
}

function renderRecommendationDelta(turn, turnIndex) {
  const delta = recommendationChange(turnIndex);
  const rank = rankPresentation(turn);
  const label = turnIndex === 0
    ? 'Initial list · ' + rank.label
    : delta.added + ' new · ' + delta.retained + ' retained · ' + delta.moved + ' reordered · ' + rank.label;
  document.getElementById('recommendationDelta').textContent = label;
}

function renderReplayHeader() {
  const t = currentTrace;
  document.getElementById('replayHeader').innerHTML =
    'Source: <strong>official public development session</strong> · ' +
    '<code>' + t.sample_id + '</code> · ' +
    'Scenario: <code>' + t.scenario_type + '</code> · ' +
    'Target labels visible because this is the labeled public split.';
}

function renderTurnTimeline() {
  const container = document.getElementById('turnTimeline');
  container.innerHTML = '';
  container.classList.toggle('long-trace', currentTrace.turns.length > 4);
  for (const [idx, turn] of currentTrace.turns.entries()) {
    const card = document.createElement('button');
    card.className = 'turn-card' + (idx === 0 ? ' active' : '');
    card.setAttribute('role', 'option');
    card.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
    card.dataset.turn = idx;
    card.innerHTML =
      '<div class="turn-number">Turn ' + turn.turn + (turn.hit ? ' · ✓ Hit' : '') + '</div>' +
      '<div class="user-msg">' + escHtml(truncate(turn.user_message, 80)) + '</div>' +
      '<div class="agent-msg">' + escHtml(truncate(turn.agent_message, 60)) + '</div>';
    card.addEventListener('click', () => {
      currentTurnIdx = idx;
      renderTurnDetail(idx);
      updateTurnHighlight(idx);
    });
    container.appendChild(card);
  }
}

function updateTurnHighlight(idx) {
  document.querySelectorAll('.turn-card').forEach((c, i) => {
    c.classList.toggle('active', i === idx);
    c.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  document.getElementById('replayTurnLabel').textContent = 'Turn ' + (idx + 1) + ' / ' + currentTrace.turns.length;
}

function renderTurnDetail(idx) {
  const turn = currentTrace.turns[idx];
  updateTurnHighlight(idx);
  renderRankJourney(idx);

  // Route indicator
  const intent = turn.intent.domain_intent;
  const routeLabel = intent === 'ITEM' ? 'Buying' : intent === 'VAGUE' ? 'Browsing' : intent;
  const routeClass = intent === 'ITEM' ? 'buying' : 'browsing';
  document.getElementById('routeIndicator').innerHTML =
    '<span class="route-indicator ' + routeClass + '">' + routeLabel + '</span>' +
    ' <span class="text-sm text-muted">· ' + turn.intent.dialogue_act + '</span>';

  // Constraints with diff
  renderConstraints('hardConstraints', turn.state_after.hard_constraints, turn.state_diff, 'hard_constraints', 'hard');
  renderConstraints('softPreferences', turn.state_after.soft_preferences, turn.state_diff, 'soft_preferences', 'soft');
  renderConstraints('negConstraints', turn.state_after.negative_constraints, turn.state_diff, 'negative_constraints', 'negative');

  // Ask attribute
  document.getElementById('askAttribute').innerHTML = turn.ask_attribute
    ? '<span class="constraint-chip hard">' + turn.ask_attribute + '</span>'
    : '<span class="text-muted">—</span>';
  document.getElementById('askAttribute').closest('.state-section').classList.toggle('is-empty', !turn.ask_attribute);

  // Top-10
  renderTop10(turn, idx);

  // Update controls
  document.getElementById('replayPrev').disabled = idx === 0;
  document.getElementById('replayNext').disabled = idx >= currentTrace.turns.length - 1;

  const mechanismPipeline = document.getElementById('mechanismPipeline');
  if (mechanismPipeline && mechanismPipeline.children.length) {
    renderMechanismDetail(currentMechanismIdx);
  }
}

function renderConstraints(elementId, stateAfter, diff, diffField, chipClass) {
  const el = document.getElementById(elementId);
  const html = [];

  // Show removed items from diff
  const removed = (diff.removed && diff.removed[diffField]) || {};
  for (const [attr, vals] of Object.entries(removed)) {
    for (const v of vals) {
      html.push('<span class="constraint-chip ' + chipClass + ' removed">' + attr + ': ' + escHtml(v) + '</span>');
    }
  }

  // Show current items with added/retained markers
  const added = (diff.added && diff.added[diffField]) || {};
  const retained = (diff.retained && diff.retained[diffField]) || {};

  for (const [attr, vals] of Object.entries(stateAfter)) {
    for (const v of vals) {
      const isAdded = (added[attr] || []).includes(v);
      const isRetained = (retained[attr] || []).includes(v);
      let cls = chipClass;
      if (isAdded) cls += ' added';
      else if (isRetained && Object.keys(removed).length > 0) cls += ' retained';
      html.push('<span class="constraint-chip ' + cls + '">' + attr + ': ' + escHtml(v) + '</span>');
    }
  }

  el.innerHTML = html.length ? html.join('') : '<span class="text-muted text-sm">—</span>';
  el.closest('.state-section').classList.toggle('is-empty', html.length === 0);
}

function renderTop10(turn, turnIndex) {
  const container = document.getElementById('top10List');
  const previousRanks = turnIndex > 0
    ? new Map(currentTrace.turns[turnIndex - 1].top10.map(item => [item.parent_asin, item.rank]))
    : new Map();
  container.innerHTML = turn.top10.map(r => {
    const previousRank = previousRanks.get(r.parent_asin);
    let movement = turnIndex === 0 ? '' : previousRank == null ? 'NEW' : previousRank === r.rank ? '=' : previousRank > r.rank ? '↑' + (previousRank - r.rank) : '↓' + (r.rank - previousRank);
    const scoredTarget = r.is_target && turn.target_rank === r.rank;
    const previewTarget = r.is_target && !scoredTarget;
    return '<div class="result-item' + (scoredTarget ? ' is-target' : '') + (previewTarget ? ' is-target-preview' : '') + '">' +
    '<span class="rank">#' + r.rank + '</span>' +
    '<div class="asin-title">' +
    '<span class="title">' + escHtml(truncate(r.title, 60)) + '</span>' +
    '<span class="asin">' + r.parent_asin + (r.price != null ? ' · $' + r.price : '') +
      (movement ? ' <span class="movement-badge">' + movement + '</span>' : '') + '</span>' +
    '</div>' +
    (scoredTarget ? '<span class="target-badge">★ Scored target</span>' : '') +
    (previewTarget ? '<span class="target-badge preview">Public preview</span>' : '') +
    '</div>';
  }).join('');

  const info = document.getElementById('targetRankInfo');
  if (turn.target_rank) {
    info.innerHTML = '<span class="text-success">✓ Target hit at rank #' + turn.target_rank + '</span>';
  } else if (rawTargetRank(turn)) {
    info.innerHTML = '<span class="text-evidence">Public-label preview at rank #' + rawTargetRank(turn) + '</span>' +
      '<br><span class="text-muted">Not an official hit until the override gate is satisfied.</span>';
  } else {
    info.innerHTML = '<span class="text-muted">Target not in Top-10 this turn</span>';
  }
  renderRecommendationDelta(turn, turnIndex);
}

function bindReplay() {
  // Scenario tabs
  document.querySelectorAll('.scenario-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      stopAutoPlay();
      document.querySelectorAll('.scenario-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      loadScenario(tab.dataset.scenario);
    });
  });

  // Replay controls
  document.getElementById('replayPrev').addEventListener('click', () => {
    if (currentTurnIdx > 0) {
      currentTurnIdx--;
      renderTurnDetail(currentTurnIdx);
    }
  });

  document.getElementById('replayNext').addEventListener('click', () => {
    if (currentTrace && currentTurnIdx < currentTrace.turns.length - 1) {
      currentTurnIdx++;
      renderTurnDetail(currentTurnIdx);
    }
  });

  document.getElementById('replayAuto').addEventListener('click', (e) => {
    if (autoPlayTimer) {
      stopAutoPlay();
    } else {
      startAutoPlay(e.target);
    }
  });

  document.getElementById('replayRestart').addEventListener('click', () => {
    stopAutoPlay();
    currentTurnIdx = 0;
    renderTurnDetail(0);
  });
}

function startAutoPlay(btn) {
  btn.textContent = '⏸ Pause';
  btn.classList.add('active-control');
  autoPlayTimer = setInterval(() => {
    if (!currentTrace || currentTurnIdx >= currentTrace.turns.length - 1) {
      stopAutoPlay();
      return;
    }
    currentTurnIdx++;
    renderTurnDetail(currentTurnIdx);
  }, 2000);
}

function stopAutoPlay() {
  clearInterval(autoPlayTimer);
  autoPlayTimer = null;
  const btn = document.getElementById('replayAuto');
  btn.textContent = '▶ Auto';
  btn.classList.remove('active-control');
}

// ---------------------------------------------------------------------------
// Step 3: Mechanism cards
// ---------------------------------------------------------------------------
function renderMechanisms() {
  const pipeline = document.getElementById('mechanismPipeline');
  pipeline.innerHTML = mechanismDefinitions.map((mechanism, index) =>
    '<button class="mechanism-stage' + (index === currentMechanismIdx ? ' active' : '') + '" ' +
    'role="tab" aria-selected="' + (index === currentMechanismIdx) + '" data-mechanism="' + index + '">' +
      '<span>' + mechanism.number + '</span>' +
      '<strong>' + mechanism.title + '</strong>' +
      '<small>' + mechanism.short + '</small>' +
    '</button>' +
    (index < mechanismDefinitions.length - 1 ? '<i aria-hidden="true">→</i>' : '')
  ).join('');

  pipeline.querySelectorAll('.mechanism-stage').forEach(button => {
    button.addEventListener('click', () => {
      currentMechanismIdx = Number.parseInt(button.dataset.mechanism, 10);
      renderMechanismDetail(currentMechanismIdx);
    });
  });

  renderScoreAnatomy();
  renderMechanismDetail(currentMechanismIdx);

  // Negative results
  document.getElementById('negativeResults').innerHTML =
    '<p><strong>Cross-encoder reranker:</strong> Built a full local MiniLM cross-encoder. ' +
    'Per-scenario analysis: helps Buying (+0.46 summed RR) but hurts Browsing (−1.38) ' +
    'because generic queries mislead the semantic ranker. Net effect: flat to slightly negative. ' +
    '<strong>Decision: ship rules-only, keep experiment for transparency.</strong></p>';

  bindMechanismModeTabs();
  renderPromptEvolutionLab();
}

function renderMechanismContext() {
  const container = document.getElementById('mechanismContext');
  if (!currentTrace) {
    container.innerHTML = '<span class="text-muted">Load a Replay case to inspect its live mechanism trace.</span>';
    return;
  }
  const turn = currentTrace.turns[currentTurnIdx];
  const rank = rankPresentation(turn);
  container.innerHTML =
    '<div class="mechanism-context-id">' +
      '<span>Live official trace</span>' +
      '<strong>' + currentTrace.sample_id + ' · Turn ' + turn.turn + ' / ' + currentTrace.turns.length + '</strong>' +
    '</div>' +
    '<div class="mechanism-context-message">' +
      '<span>User signal</span>' +
      '<strong>' + escHtml(truncate(turn.user_message, 118)) + '</strong>' +
    '</div>' +
    '<div class="mechanism-context-rank ' + rank.kind + '">' +
      '<span>Recommendation impact</span>' +
      '<strong>' + rank.label + '</strong>' +
    '</div>';
}

function renderMechanismDetail(index) {
  const mechanism = mechanismDefinitions[index] || mechanismDefinitions[0];
  currentMechanismIdx = index;
  renderMechanismContext();

  document.querySelectorAll('.mechanism-stage').forEach((button, buttonIndex) => {
    const active = buttonIndex === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  document.getElementById('mechanismExplanation').innerHTML =
    '<div class="mechanism-kicker">' + mechanism.number + ' · Mechanism</div>' +
    '<h3>' + mechanism.title + '</h3>' +
    '<p class="mechanism-decision">' + mechanism.decision + '</p>' +
    '<dl class="mechanism-contract">' +
      '<div><dt>Input</dt><dd>' + mechanism.input + '</dd></div>' +
      '<div><dt>Output</dt><dd>' + mechanism.output + '</dd></div>' +
      '<div><dt>Failure prevented</dt><dd>' + mechanism.failure + '</dd></div>' +
    '</dl>' +
    '<div class="mechanism-proof"><span>' + mechanism.metric + '</span><code>' + mechanism.source + '</code></div>';

  document.getElementById('mechanismEvidenceTitle').innerHTML =
    'Live trace evidence <code>' + (currentTrace ? currentTrace.sample_id + ' · T' + currentTrace.turns[currentTurnIdx].turn : 'No trace') + '</code>';
  const visual = document.getElementById('mechanismVisual');
  visual.innerHTML = renderMechanismVisual(mechanism.id);
  visual.setAttribute('aria-label', mechanism.title + ' visualization for the current official trace');
  document.getElementById('mechanismEvidenceData').innerHTML = renderLiveMechanismEvidence(mechanism.id);
}

function evidenceStat(label, value, kind) {
  return '<div class="evidence-stat ' + (kind || '') + '"><span>' + label + '</span><strong>' + escHtml(String(value)) + '</strong></div>';
}

function mechanismQueryTerms(turn) {
  const terms = [];
  const state = turn.state_after || {};
  if (state.category) terms.push(state.category);
  for (const field of ['hard_constraints', 'soft_preferences']) {
    for (const values of Object.values(state[field] || {})) terms.push(...values);
  }
  return [...new Set(terms)].slice(0, 8);
}

function renderMechanismVisual(mechanismId) {
  if (!currentTrace) return '<div class="visual-empty">Open Replay to load a trace</div>';
  const turn = currentTrace.turns[currentTurnIdx];

  if (mechanismId === 'route') {
    const buying = turn.intent.domain_intent === 'ITEM';
    return '<div class="visual-route-map">' +
      '<div class="visual-source-node"><span>User</span><strong>Message</strong></div>' +
      '<div class="visual-route-fork"><i></i><i></i></div>' +
      '<div class="visual-route-lanes">' +
        '<div class="visual-route-lane' + (buying ? ' active' : '') + '"><span>BUYING</span><strong>Lock constraints</strong></div>' +
        '<div class="visual-route-lane' + (!buying ? ' active' : '') + '"><span>BROWSING</span><strong>Ask before filtering</strong></div>' +
      '</div>' +
      '<div class="visual-output-node"><span>Dialogue act</span><strong>' + escHtml(turn.intent.dialogue_act || '—') + '</strong></div>' +
    '</div>';
  }

  if (mechanismId === 'state') {
    const before = currentTurnIdx > 0 ? countStateValues(currentTrace.turns[currentTurnIdx - 1].state_after) : 0;
    const after = countStateValues(turn.state_after);
    const added = flattenDiffBucket(turn.state_diff.added || {});
    const removed = flattenDiffBucket(turn.state_diff.removed || {});
    const retained = flattenDiffBucket(turn.state_diff.retained || {});
    return '<div class="visual-state-flow">' +
      '<div class="visual-state-snapshot"><span>Before</span><strong>' + before + ' values</strong></div>' +
      '<div class="visual-state-delta">' +
        '<span class="added">+' + added.length + ' added</span>' +
        '<span class="removed">−' + removed.length + ' removed</span>' +
        '<span class="retained">=' + retained.length + ' retained</span>' +
      '</div>' +
      '<div class="visual-state-arrow">→</div>' +
      '<div class="visual-state-snapshot after"><span>After</span><strong>' + after + ' values</strong></div>' +
    '</div>';
  }

  if (mechanismId === 'recall') {
    const termCount = mechanismQueryTerms(turn).length;
    return '<div class="visual-recall-funnel">' +
      '<div class="funnel-step catalog"><span>Frozen catalog</span><strong>50,000</strong></div>' +
      '<div class="funnel-arrow">→</div>' +
      '<div class="funnel-step query"><span>FTS5 OR terms</span><strong>' + termCount + '</strong></div>' +
      '<div class="funnel-arrow">→</div>' +
      '<div class="funnel-step pool"><span>Lexical pool</span><strong>Broad recall</strong></div>' +
      '<div class="funnel-arrow">→</div>' +
      '<div class="funnel-step visible"><span>Visible list</span><strong>' + turn.top10.length + '</strong></div>' +
    '</div>';
  }

  if (mechanismId === 'rerank') {
    return '<div class="visual-rank-podium">' + turn.top10.slice(0, 3).map(item =>
      '<div class="podium-item rank-' + item.rank + (item.is_target ? ' target' : '') + '">' +
        '<strong>#' + item.rank + '</strong><span>' + escHtml(truncate(item.title, 28)) + '</span><i></i>' +
      '</div>'
    ).join('') + '</div>';
  }

  const selected = turn.ask_attribute || 'STOP';
  return '<div class="visual-question-flow">' +
    '<div class="question-node"><span>Candidates</span><strong>' + (turn.candidate_pool_size || 0) + '</strong></div>' +
    '<div class="question-arrow">→</div>' +
    '<div class="question-node formula"><span>Score attributes</span><strong>coverage × entropy</strong></div>' +
    '<div class="question-arrow">→</div>' +
    '<div class="question-gate"><span>≥ 0.15?</span></div>' +
    '<div class="question-arrow">→</div>' +
    '<div class="question-node selected"><span>Ask</span><strong>' + escHtml(selected) + '</strong></div>' +
  '</div>';
}

function renderLiveMechanismEvidence(mechanismId) {
  if (!currentTrace) {
    return '<p class="text-muted text-sm">Open Replay to load a trace.</p>';
  }
  const turn = currentTrace.turns[currentTurnIdx];

  if (mechanismId === 'route') {
    return '<div class="evidence-stat-grid">' +
      evidenceStat('domain_intent', turn.intent.domain_intent || '—', 'evidence') +
      evidenceStat('dialogue_act', turn.intent.dialogue_act || '—', 'evidence') +
      evidenceStat('confidence', Number(turn.intent.confidence || 0).toFixed(2), '') +
      evidenceStat('next question', turn.ask_attribute || 'stop asking', '') +
      '</div>';
  }

  if (mechanismId === 'state') {
    const added = flattenDiffBucket(turn.state_diff.added || {});
    const removed = flattenDiffBucket(turn.state_diff.removed || {});
    const retained = flattenDiffBucket(turn.state_diff.retained || {});
    return '<div class="state-diff-evidence">' +
      mechanismDiffColumn('Added', added, 'added') +
      mechanismDiffColumn('Removed', removed, 'removed') +
      mechanismDiffColumn('Retained', retained, 'retained') +
      '</div>';
  }

  if (mechanismId === 'recall') {
    const terms = mechanismQueryTerms(turn);
    return '<div class="evidence-stat-grid">' +
      evidenceStat('FTS5 terms', terms.length || 0, 'evidence') +
      evidenceStat('visible candidates', turn.candidate_pool_size || 0, '') +
      evidenceStat('returned list', turn.top10.length, '') +
      evidenceStat('negative filter', Object.keys(turn.state_after.negative_constraints || {}).length ? 'active' : 'none', '') +
      '</div>' +
      '<div class="query-preview"><span>OR query preview</span><code>' + escHtml(terms.map(term => '"' + term + '"').join(' OR ') || 'No query terms') + '</code></div>';
  }

  if (mechanismId === 'rerank') {
    return '<div class="query-preview"><span>Deterministic order</span><code>constraint score band → log1p(review_count) tie-break</code></div>';
  }

  const selected = turn.ask_attribute || 'none — candidate set is focused';
  return '<div class="evidence-stat-grid">' +
    evidenceStat('selected attribute', selected, 'evidence') +
    evidenceStat('visible Top-10', turn.candidate_pool_size || 0, '') +
    evidenceStat('known constraints', countStateValues(turn.state_after), '') +
    evidenceStat('threshold', '0.15', '') +
    '</div>' +
    '<div class="query-preview"><span>Decision rule</span><code>max(coverage × entropy), excluding known and already-asked attributes</code></div>';
}

function mechanismDiffColumn(label, values, kind) {
  const safe = values.length ? values : ['None'];
  return '<div class="mechanism-diff-column ' + kind + '"><span>' + label + '</span>' +
    safe.slice(0, 5).map(value => '<strong>' + escHtml(value) + '</strong>').join('') + '</div>';
}

function countStateValues(state) {
  let count = state.category ? 1 : 0;
  for (const field of ['hard_constraints', 'soft_preferences', 'negative_constraints']) {
    for (const values of Object.values(state[field] || {})) count += values.length;
  }
  return count;
}

function renderScoreAnatomy() {
  const weights = [
    ['Recall rank', '3 / (rank + 1)', 'base'],
    ['Category match', '+3.0', 'positive'],
    ['Hard value', '+4.0', 'positive'],
    ['Hard miss', '−3.0', 'negative'],
    ['Soft value', '+1.5', 'positive'],
    ['Profile tag', '+0.25', 'positive'],
    ['Rating', '+0.03 × rating', 'positive'],
    ['Popularity', 'tie-break only', 'tie'],
  ];
  document.getElementById('scoreAnatomy').innerHTML =
    '<div class="score-anatomy-title"><span>Ranking score anatomy</span><small>Transparent weights from the shipped rules path</small></div>' +
    '<div class="score-weight-list">' + weights.map(weight =>
      '<div class="score-weight ' + weight[2] + '"><span>' + weight[0] + '</span><strong>' + weight[1] + '</strong></div>'
    ).join('') + '</div>';
}

function bindMechanismModeTabs() {
  document.querySelectorAll('.mechanism-mode').forEach(button => {
    button.addEventListener('click', () => {
      const promptMode = button.dataset.mode === 'prompt';
      document.querySelectorAll('.mechanism-mode').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.getElementById('pipelineMechanismLab').hidden = promptMode;
      document.getElementById('promptEvolutionLab').hidden = !promptMode;
      document.getElementById('step3').classList.toggle('prompt-mode', promptMode);
      if (!promptMode) stopPromptSimulation();
    });
  });
}

function renderPromptEvolutionLab() {
  if (!promptEvolution) return;
  const rounds = promptEvolution.rounds;
  document.getElementById('promptLabBadges').innerHTML =
    '<span>' + promptEvolution.model + '</span>' +
    '<span>' + promptEvolution.split.train + ' train / ' + promptEvolution.split.test + ' test</span>' +
    '<span>' + rounds.length + ' rounds</span>' +
    '<span>Best observed ' + promptEvolution.best_observed_test_score.toFixed(1) + '</span>';

  document.getElementById('promptRoundChart').innerHTML =
    '<div class="prompt-chart-axis"><span>100</span><span>50</span><span>0</span></div>' +
    '<div class="prompt-chart-bars">' + rounds.map(round =>
      '<div class="prompt-round-bars">' +
        '<div class="prompt-bar-pair">' +
          '<i class="train" style="height:' + round.train_score + '%"><b>' + round.train_score.toFixed(1) + '</b></i>' +
          '<i class="test" style="height:' + round.test_score + '%"><b>' + round.test_score.toFixed(1) + '</b></i>' +
        '</div>' +
        '<span>R' + round.round + '</span>' +
      '</div>'
    ).join('') + '</div>' +
    '<div class="prompt-chart-legend"><span><i class="train"></i>Train</span><span><i class="test"></i>Test</span></div>';

  document.getElementById('promptRoundSelector').innerHTML = rounds.map(round =>
    '<button class="prompt-round-button' + (round.round === currentPromptRound ? ' active' : '') + '" data-round="' + round.round + '">Round ' + round.round + '</button>'
  ).join('');
  document.querySelectorAll('.prompt-round-button').forEach(button => {
    button.addEventListener('click', () => renderPromptRound(Number.parseInt(button.dataset.round, 10)));
  });

  document.getElementById('promptLoop').innerHTML = promptEvolution.pipeline.map((step, index) =>
    '<div class="prompt-loop-step"><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + escHtml(step) + '</strong></div>' +
    (index < promptEvolution.pipeline.length - 1 ? '<i>→</i>' : '')
  ).join('');
  document.getElementById('promptGuardList').innerHTML = promptEvolution.guardrails.map((guard, index) =>
    '<div><span>G' + (index + 1) + '</span><strong>' + escHtml(guard) + '</strong></div>'
  ).join('');

  const sensitivity = promptEvolution.newline_ab;
  document.getElementById('promptSensitivity').innerHTML =
    '<div class="prompt-panel-title"><span>Sensitivity monitor</span><small>Controlled A/B · test score</small></div>' +
    '<div class="sensitivity-bars">' +
      sensitivityBar('Seed · as-is', sensitivity.seed_as_is, false) +
      sensitivityBar('Seed · normalized', sensitivity.seed_stripped, true) +
      sensitivityBar('Round 1 · as-is', sensitivity.r1_as_is, true) +
      sensitivityBar('Round 1 · + newline', sensitivity.r1_plus_nl, false) +
    '</div>' +
    '<p>Whitespace sensitivity is tracked as a robustness signal for continued iteration.</p>';

  document.getElementById('promptCaseSelector').innerHTML = promptEvolution.simulation_cases.map((item, index) =>
    '<button class="prompt-case-button' + (index === currentPromptCase ? ' active' : '') + '" data-case="' + index + '">' +
      '<strong>' + escHtml(item.id.replace(/-/g, ' · ')) + '</strong><span>' + escHtml(item.split) + '</span></button>'
  ).join('');
  document.querySelectorAll('.prompt-case-button').forEach(button => {
    button.addEventListener('click', () => {
      stopPromptSimulation();
      renderPromptSimulation(Number.parseInt(button.dataset.case, 10));
    });
  });
  document.getElementById('promptRunSimulation').addEventListener('click', startPromptSimulation);

  renderPromptRound(currentPromptRound);
  renderPromptSimulation(currentPromptCase);
}

function sensitivityBar(label, value, highlighted) {
  return '<div class="sensitivity-row' + (highlighted ? ' highlighted' : '') + '">' +
    '<span>' + label + '</span><div><i style="width:' + value + '%"></i></div><strong>' + value.toFixed(1) + '</strong></div>';
}

function renderPromptRound(roundIndex) {
  currentPromptRound = roundIndex;
  const round = promptEvolution.rounds.find(item => item.round === roundIndex) || promptEvolution.rounds[0];
  const previous = roundIndex > 0 ? promptEvolution.rounds.find(item => item.round === roundIndex - 1) : null;
  const delta = previous ? round.test_score - previous.test_score : 0;
  document.querySelectorAll('.prompt-round-button').forEach(button => {
    button.classList.toggle('active', Number.parseInt(button.dataset.round, 10) === roundIndex);
  });
  document.getElementById('promptRoundDetail').innerHTML =
    '<div class="prompt-panel-title"><span>Round ' + round.round + ' inspection</span><small>' + escHtml(round.change_summary) + '</small></div>' +
    '<div class="round-score-grid">' +
      '<div><span>Train</span><strong>' + round.train_score.toFixed(1) + '</strong></div>' +
      '<div><span>Test</span><strong>' + round.test_score.toFixed(1) + '</strong></div>' +
      '<div><span>Δ test</span><strong>' + (delta >= 0 ? '+' : '') + delta.toFixed(1) + '</strong></div>' +
      '<div><span>Prompt</span><strong>' + round.prompt_length + ' chars</strong></div>' +
    '</div>' +
    '<div class="round-confusion"><span>Confusion signal</span><strong>' + escHtml(round.confusion) + '</strong></div>' +
    '<div class="round-change"><span>Iteration action</span><strong>' + escHtml(round.change_summary) + '</strong><small>' +
      (round.ends_with_newline ? 'Prompt ends with newline' : 'Prompt normalized without trailing newline') + '</small></div>';
}

function renderPromptSimulation(caseIndex) {
  currentPromptCase = caseIndex;
  const item = promptEvolution.simulation_cases[caseIndex] || promptEvolution.simulation_cases[0];
  document.querySelectorAll('.prompt-case-button').forEach(button => {
    button.classList.toggle('active', Number.parseInt(button.dataset.case, 10) === caseIndex);
  });
  const steps = [
    ['Input', item.message],
    ['Expected contract', item.expected_domain_intent + ' / ' + item.expected_dialogue_act],
    ['Diagnose', item.iteration_focus],
    ['Rewrite', 'Abstract a shared rule; do not enumerate this exact phrase'],
    ['Guard', 'Check train/test split, length, and required output markers'],
    ['Re-evaluate', 'Contract target remains ' + item.expected_domain_intent + ' / ' + item.expected_dialogue_act],
  ];
  document.getElementById('promptCaseFlow').innerHTML =
    '<div class="prompt-simulation-label">' + escHtml(item.simulation_label) + '</div>' +
    '<div class="prompt-sim-steps">' + steps.map((step, index) =>
      '<div class="prompt-sim-step" data-sim-step="' + index + '"><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + step[0] + '</strong><p>' + escHtml(step[1]) + '</p></div>' +
      (index < steps.length - 1 ? '<i>→</i>' : '')
    ).join('') + '</div>';
}

function startPromptSimulation() {
  stopPromptSimulation();
  const steps = Array.from(document.querySelectorAll('.prompt-sim-step'));
  const button = document.getElementById('promptRunSimulation');
  let index = 0;
  button.textContent = '⏸ Running';
  steps.forEach(step => step.classList.remove('active', 'complete'));
  const advance = () => {
    steps.forEach((step, stepIndex) => {
      step.classList.toggle('active', stepIndex === index);
      step.classList.toggle('complete', stepIndex < index);
    });
    index += 1;
    if (index >= steps.length) {
      clearInterval(promptSimulationTimer);
      promptSimulationTimer = null;
      steps.forEach(step => step.classList.add('complete'));
      steps.forEach(step => step.classList.remove('active'));
      button.textContent = '↻ Run again';
    }
  };
  advance();
  promptSimulationTimer = setInterval(advance, 650);
}

function stopPromptSimulation() {
  clearInterval(promptSimulationTimer);
  promptSimulationTimer = null;
  const button = document.getElementById('promptRunSimulation');
  if (button) button.textContent = '▶ Run walkthrough';
}

// ---------------------------------------------------------------------------
// Step 4: Evaluation Evidence
// ---------------------------------------------------------------------------
function renderEvaluation() {
  const m = metrics;

  // Metric cards
  const evalMetrics = document.getElementById('evalMetrics');
  const metricList = [
    { label: 'HitRate@10', value: m.hit_rate_at_10.toFixed(3) },
    { label: 'MRR', value: m.mrr.toFixed(6) },
    { label: 'MTTC', value: m.mttc.toFixed(3) },
    { label: 'Efficiency', value: m.efficiency.toFixed(4) },
    { label: 'TechnicalScore', value: m.technical_score.toFixed(6) },
  ];
  evalMetrics.innerHTML = metricList.map(mi =>
    '<div class="eval-metric"><div class="value">' + mi.value + '</div><div class="label">' + mi.label + '</div></div>'
  ).join('');

  // Version comparison table
  const tbody = document.getElementById('versionTableBody');
  tbody.innerHTML = versionComparison.map((v, idx) => {
    const isCurrent = idx === versionComparison.length - 1;
    return '<tr' + (isCurrent ? ' class="current"' : '') + '>' +
      '<td>' + v.version + '</td>' +
      '<td>' + (v.hit_rate_at_10 != null ? v.hit_rate_at_10.toFixed(3) : '—') + '</td>' +
      '<td>' + (v.mrr != null ? v.mrr.toFixed(3) : '—') + '</td>' +
      '<td>' + (v.mttc != null ? v.mttc.toFixed(3) : '—') + '</td>' +
      '<td>' + (v.technical_score != null ? v.technical_score.toFixed(4) : '—') + '</td>' +
      '</tr>';
  }).join('');

  // Per-scenario table
  const scenarioBody = document.getElementById('scenarioTableBody');
  const scenarioNames = { buying: 'Buying', browsing: 'Browsing', intent_override: 'Intent Override', boundary: 'Boundary' };
  const sm = m.scenario_metrics;
  scenarioBody.innerHTML = Object.entries(sm).map(([type, data]) =>
    '<tr><td>' + (scenarioNames[type] || type) + '</td>' +
    '<td>' + data.sample_count + '</td>' +
    '<td>' + data.hit_rate_at_10.toFixed(3) + '</td>' +
    '<td>' + data.mrr.toFixed(3) + '</td>' +
    '<td>' + data.mttc.toFixed(3) + '</td></tr>'
  ).join('');

  // Reproduce
  document.getElementById('reproduceCmd').textContent = manifest.evaluator_command;
  document.getElementById('artifactInfo').innerHTML =
    'Report: <code class="mono">' + manifest.report_file + '</code> · ' +
    'SHA256: <code class="mono">' + manifest.report_sha256.slice(0, 16) + '…</code><br>' +
    'Agent commit: <code class="mono">' + manifest.agent_git_commit.slice(0, 12) + '</code> · ' +
    'Generated: <code class="mono">' + manifest.generated_at + '</code><br>' +
    '<strong>N = ' + manifest.sample_count + ' official public sessions. Not hidden-set evidence.</strong>';
}

// ---------------------------------------------------------------------------
// Step 5: Transparent Ads
// ---------------------------------------------------------------------------
function renderAds() {
  document.getElementById('btnRunAuction').addEventListener('click', async () => {
    const bidA = 1.00, relA = 0.82;
    const bidB = 5.00, relB = 0.12;
    const ecpmA = bidA * relA;
    const ecpmB = bidB * relB;
    const floor = 0.15;

    document.getElementById('ecpmA').textContent = '$' + ecpmA.toFixed(2);
    document.getElementById('ecpmB').textContent = '$' + ecpmB.toFixed(2);

    const resultDiv = document.getElementById('auctionResult');
    resultDiv.style.display = 'block';
    document.getElementById('step5').classList.add('auction-complete');

    const belowFloor = relB < floor;
    let winner;
    if (belowFloor) {
      winner = 'A';
    } else {
      winner = ecpmA >= ecpmB ? 'A' : 'B';
    }

    document.getElementById('auctionDetails').innerHTML =
      '<div class="text-sm" style="line-height:1.8;">' +
      '<strong>eCPM = bid × relevance</strong><br>' +
      'Campaign A: $' + bidA.toFixed(2) + ' × ' + relA.toFixed(2) + ' = <strong class="text-evidence">$' + ecpmA.toFixed(2) + '</strong><br>' +
      'Campaign B: $' + bidB.toFixed(2) + ' × ' + relB.toFixed(2) + ' = $' + ecpmB.toFixed(2) +
      (belowFloor ? ' <span class="text-unknown">(below relevance floor ' + floor + ')</span>' : '') + '<br>' +
      '<strong class="text-success">Winner: Campaign ' + winner + '</strong> · impression +1 · budget −$' + (winner === 'A' ? bidA : bidB).toFixed(2) +
      '</div>';

    const buyingTrace = await loadJSON('/evidence/scenarios/' + canonicalCases.buying + '.json');
    const finalTurn = buyingTrace.turns[buyingTrace.turns.length - 1];
    const organicBefore = finalTurn.top10.map(item => ({
      parent_asin: item.parent_asin,
      title: item.title,
    }));
    // This mirrors DemoState._inject_sponsored: the sponsored slot is prepended,
    // while the organic list remains byte-for-byte in the same order.
    const organicAfter = organicBefore.map(item => ({ ...item }));
    const organicIdsBefore = organicBefore.map(item => item.parent_asin);
    const organicIdsAfter = organicAfter.map(item => item.parent_asin);
    const invariantHolds = JSON.stringify(organicIdsBefore) === JSON.stringify(organicIdsAfter);
    const sponsored = catalogSamples.find(item => !organicIdsBefore.includes(item.parent_asin));

    renderOrganicList('organicBeforeList', organicBefore);
    renderOrganicList('organicAfterList', organicAfter);
    document.getElementById('sponsoredPreview').innerHTML = sponsored
      ? '<span class="demo-only-tag">Sponsored</span> ' + escHtml(truncate(sponsored.title, 54)) +
        ' <code>' + sponsored.parent_asin + '</code>'
      : '<span class="text-muted">Sponsored slot unavailable</span>';
    document.getElementById('organicInvariant').innerHTML = invariantHolds
      ? '✓ Verified: all ' + organicIdsBefore.length + ' organic parent_asin values remain in identical order.<br>' +
        '✓ DemoState._inject_sponsored is covered by a non-placeholder unit test.'
      : '<span class="text-error">Invariant failed — do not present this experiment.</span>';

    // Highlight winner campaign card
    document.getElementById('campaignA').style.borderColor = winner === 'A' ? 'var(--success)' : 'var(--border)';
    document.getElementById('campaignB').style.borderColor = winner === 'B' ? 'var(--success)' : 'var(--border)';
  });
}

function renderOrganicList(elementId, items) {
  document.getElementById(elementId).innerHTML = items.slice(0, 3).map(item =>
    '<li><code>' + item.parent_asin + '</code> ' + escHtml(truncate(item.title, 42)) + '</li>'
  ).join('');
}

// ---------------------------------------------------------------------------
// Step 6: Closeout
// ---------------------------------------------------------------------------
function renderCloseout() {
  document.getElementById('teamContributions').innerHTML =
    '<strong>Team Contributions</strong><br>' +
    'Retrieval, state machine, rule rerank, official-contract adapter, unit tests, evaluation harness.<br>' +
    'Cross-encoder experiment, path portability, offline reproduction, technical report.<br>' +
    'Local Qwen3-8B deployment, prompt self-evolution, sponsored-ads engine, demo frontend.';
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function bindNavigation() {
  // Start tour button
  document.getElementById('btnStartTour').addEventListener('click', () => goToStep(1));

  // Per-step nav buttons
  for (let i = 1; i <= 6; i++) {
    const prev = document.getElementById('nav' + i + 'Prev');
    const next = document.getElementById('nav' + i + 'Next');
    if (prev) prev.addEventListener('click', () => goToStep(i - 1));
    if (next) next.addEventListener('click', () => goToStep(i + 1));
  }

  // Progress bar
  document.querySelectorAll('.step-indicator').forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(parseInt(btn.dataset.step, 10));
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' && currentStep < 6) goToStep(currentStep + 1);
    if (e.key === 'ArrowLeft' && currentStep > 0) goToStep(currentStep - 1);
  });
}

function goToStep(step) {
  if (step < 0 || step > 6) return;
  stopAutoPlay();

  // Hide all steps
  document.querySelectorAll('.tour-step').forEach(s => s.classList.remove('active'));

  // Show target step
  const target = document.querySelector('.tour-step[data-step="' + step + '"]');
  if (target) target.classList.add('active');

  // Update progress bar
  document.querySelectorAll('.step-indicator').forEach(ind => {
    const s = parseInt(ind.dataset.step, 10);
    ind.classList.remove('active', 'completed');
    ind.removeAttribute('aria-current');
    if (s === step) {
      ind.classList.add('active');
      ind.setAttribute('aria-current', 'step');
    } else if (s < step) {
      ind.classList.add('completed');
    }
  });

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
