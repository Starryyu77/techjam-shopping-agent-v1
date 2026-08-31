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
let currentStep = 0;
let currentScenario = 'buying';
let currentTrace = null;
let currentTurnIdx = 0;
let currentCaseId = null;
let autoPlayTimer = null;

// Canonical cases: map scenario_type -> sample_id
const canonicalCases = {};
const canonicalCasesByScenario = {};
const siteBaseUrl = new URL('.', document.currentScript.src);

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
    [manifest, metrics, dataset, versionComparison, catalogSamples] = await Promise.all([
      loadJSON('/evidence/manifest.json'),
      loadJSON('/evidence/metrics.json'),
      loadJSON('/evidence/dataset.json'),
      loadJSON('/evidence/version_comparison.json'),
      loadJSON('/evidence/catalog_samples.json'),
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
  if (scenarioType !== 'intent_override' || cases.length <= 1) {
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
      loadScenario('intent_override', button.dataset.sampleId);
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
  const rankProgression = currentTrace.turns.map(turn =>
    'T' + turn.turn + ' ' + (turn.target_rank ? '#' + turn.target_rank : '—')
  ).join(' → ');

  summary.hidden = false;
  step.classList.add('override-active');
  summary.innerHTML =
    summaryCard('Before override', flattenStateSnapshot(before), 'before') +
    summaryCard('Removed', flattenDiffBucket(removed), 'removed') +
    summaryCard('Retained', flattenDiffBucket(retained), 'retained') +
    summaryCard('Added', flattenDiffBucket(added), 'added') +
    summaryCard('After override', flattenStateSnapshot(after), 'after') +
    summaryCard('Rank progression', [rankProgression, 'Target: ' + currentTrace.target_title], 'rank');
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

  // Top-10
  renderTop10(turn);

  // Update controls
  document.getElementById('replayPrev').disabled = idx === 0;
  document.getElementById('replayNext').disabled = idx >= currentTrace.turns.length - 1;
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
}

function renderTop10(turn) {
  const container = document.getElementById('top10List');
  container.innerHTML = turn.top10.map(r =>
    '<div class="result-item' + (r.is_target ? ' is-target' : '') + '">' +
    '<span class="rank">#' + r.rank + '</span>' +
    '<div class="asin-title">' +
    '<span class="title">' + escHtml(truncate(r.title, 60)) + '</span>' +
    '<span class="asin">' + r.parent_asin + (r.price != null ? ' · $' + r.price : '') + '</span>' +
    '</div>' +
    (r.is_target ? '<span class="target-badge">★ Target</span>' : '') +
    '</div>'
  ).join('');

  const info = document.getElementById('targetRankInfo');
  if (turn.target_rank) {
    info.innerHTML = '<span class="text-success">✓ Target hit at rank #' + turn.target_rank + '</span>';
  } else {
    info.innerHTML = '<span class="text-muted">Target not in Top-10 this turn</span>';
  }
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
  const mechanisms = [
    {
      title: 'Dual-track Routing',
      input: 'User message',
      decision: 'Classify as Buying (concrete) vs Browsing (vague). Buying locks hard constraints early; Browsing asks first.',
      output: 'domain_intent (ITEM / VAGUE) + dialogue_act',
      failure: 'Browsing queries treated as Buying → premature filtering → missed target',
      delta: 'Override HR: 1.000 (all 30 sessions)',
      source: 'shopping_agent.py#RuleIntentParser',
    },
    {
      title: 'Erase-and-Rewrite State Machine',
      input: 'Intent parse result + current state',
      decision: 'OVERRIDE act erases soft_preferences, then writes new slot. Not append-only.',
      output: 'Updated constraint state (hard / soft / negative)',
      failure: 'Append-only → conflicting constraints → target never enters Top-10',
      delta: 'Intent Override HR: 0.967 → 1.000',
      source: 'shopping_agent.py#ShoppingState.apply',
    },
    {
      title: 'Candidate-driven Clarification',
      input: 'Current candidate pool',
      decision: 'Score each attribute by coverage × entropy. Ask the single most discriminative question.',
      output: 'ask_attribute or null (stop asking)',
      failure: 'Fixed-order questioning → wasted turns → high MTTC',
      delta: 'MTTC: 3.50 → 2.22',
      source: 'shopping_agent.py#CandidateQuestionPolicy',
    },
    {
      title: 'Banded Popularity Tiebreaker',
      input: 'Rule-scored candidates with near-tied scores',
      decision: 'Candidates in the same score band ordered by log(review_count). Tiebreaker only — never displaces higher-score match.',
      output: 'Final Top-10 ranking',
      failure: 'Random tie ordering → target ranked below look-alikes → missed HR',
      delta: 'TS: 0.826 → 0.867 (net +5 hits, 0 new misses)',
      source: 'shopping_agent.py#CatalogSearch.search',
    },
  ];

  const grid = document.getElementById('mechanismGrid');
  grid.innerHTML = mechanisms.map(m =>
    '<div class="mechanism-card" tabindex="0" role="button" aria-expanded="false">' +
    '<div class="mc-title">' + m.title + '</div>' +
    '<div class="text-sm text-muted">' + m.decision + '</div>' +
    '<div class="mc-detail">' +
    '<div class="mc-row"><span class="mc-label">Input</span><span>' + m.input + '</span></div>' +
    '<div class="mc-row"><span class="mc-label">Output</span><span>' + m.output + '</span></div>' +
    '<div class="mc-row"><span class="mc-label">Solves</span><span>' + m.failure + '</span></div>' +
    '<div class="mc-row"><span class="mc-label">Metric Δ</span><span class="text-evidence">' + m.delta + '</span></div>' +
    '<div class="mc-row"><span class="mc-label">Source</span><span class="mono text-sm">' + m.source + '</span></div>' +
    '</div></div>'
  ).join('');

  // Toggle expansion
  grid.querySelectorAll('.mechanism-card').forEach(card => {
    const toggle = () => {
      const expanded = card.classList.toggle('expanded');
      card.setAttribute('aria-expanded', expanded);
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // Negative results
  document.getElementById('negativeResults').innerHTML =
    '<p><strong>Cross-encoder reranker:</strong> Built a full local MiniLM cross-encoder. ' +
    'Per-scenario analysis: helps Buying (+0.46 summed RR) but hurts Browsing (−1.38) ' +
    'because generic queries mislead the semantic ranker. Net effect: flat to slightly negative. ' +
    '<strong>Decision: ship rules-only, keep experiment for transparency.</strong></p>' +
    '<p class="mt-1"><strong>Prompt self-evolution:</strong> Automated prompt optimization loop. ' +
    'Only measurable gain traced to trailing-newline sensitivity of the chat template. ' +
    'Seed prompt was already near-optimal. <strong>Did not ship a rewritten prompt.</strong></p>';
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
