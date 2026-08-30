let sessionId = null;
let turn = 0;

const $ = (id) => document.getElementById(id);

async function post(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

function addMessage(text, who, ask) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  if (ask) {
    const a = document.createElement("div");
    a.className = "ask";
    a.textContent = "↳ asking about: " + ask;
    div.appendChild(a);
  }
  $("messages").appendChild(div);
  $("messages").scrollTop = $("messages").scrollHeight;
}

function chips(elId, mapping) {
  const el = $(elId);
  el.innerHTML = "";
  if (!mapping) return;
  const entries = Array.isArray(mapping)
    ? mapping.map((v) => [null, [v]])
    : Object.entries(mapping);
  for (const [k, vals] of entries) {
    for (const v of (vals || [])) {
      const c = document.createElement("span");
      c.className = "chip";
      c.innerHTML = k ? '<span class="k">' + k + "</span>" + v : v;
      el.appendChild(c);
    }
  }
}

// Map the agent's real domain_intent to a shopper-facing label.
const INTENT_LABEL = {
  ITEM: "buying", VAGUE: "browsing", IRRELEVANT: "off-topic",
  BENEFIT: "asking benefit",
};
// Map the agent's real dialogue act to a readable state-machine action.
const ACT_LABEL = {
  NEW: "new request", ANSWER: "answering", ADD: "adding constraint",
  NEGATE: "excluding", OVERRIDE: "override · rewrite", NO_PREFERENCE: "no preference",
  SELECT: "selecting", REJECT: "rejecting", STOP: "stopped",
  RESET: "reset", NOOP: "holding",
};

function renderState(state, intent, askAttr, poolCount) {
  chips("hard", state.hard_constraints);
  chips("soft", state.soft_preferences);
  chips("neg", state.negative_constraints);
  chips("cat", state.category ? [state.category] : []);

  intent = intent || {};
  // Real intent from the backend (not guessed from the slots).
  let intentLabel = INTENT_LABEL[intent.domain_intent] || (state.category ? "browsing" : "—");
  if (state.status === "selected") intentLabel = "selected";
  else if (state.status === "stopped") intentLabel = "stopped";

  // Real dialogue act drives the strategy label.
  let act = ACT_LABEL[intent.dialogue_act] || "—";
  const conf = intent.confidence != null ? " · " + Math.round(intent.confidence * 100) + "%" : "";

  $("pillIntent").innerHTML = "intent <b>" + intentLabel + "</b>";
  $("pillStrategy").innerHTML = "act <b>" + act + "</b>" + conf;
  $("pillTurn").innerHTML = "turn <b>" + Math.min(turn, 10) + "</b>/10";
  $("pillPool").innerHTML = "candidates <b>" + (poolCount != null ? poolCount : "—") + "</b>";
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderRecs(recs) {
  const ol = $("recs");
  ol.innerHTML = "";
  (recs || []).forEach((r, i) => {
    const li = document.createElement("li");
    if (r.sponsored) li.className = "sponsored";
    const price = r.price != null ? "$" + r.price : "";
    const store = r.store ? esc(r.store) : "";
    const meta = [store, price].filter(Boolean).join(" · ");
    const score = r.score != null ? '<span class="score">score ' + r.score.toFixed(2) + "</span>" : "";
    const reasons = (r.reasons || [])
      .map((x) => '<span class="why">' + esc(x) + "</span>")
      .join("");
    const adBadge = r.sponsored
      ? '<span class="adbadge">Sponsored' + (r.advertiser ? " · " + esc(r.advertiser) : "") + "</span>"
      : "";
    li.innerHTML =
      '<span class="rank">' + (r.sponsored ? "Ad" : i + 1) + "</span>" +
      '<span class="rbody">' +
        '<span class="t">' + esc(r.title || r.parent_asin) + adBadge + "</span>" +
        (meta ? '<span class="meta">' + meta + "</span>" : "") +
        '<span class="asin">' + esc(r.parent_asin) + "</span>" +
        (reasons ? '<span class="reasons">' + reasons + "</span>" : "") +
      "</span>" +
      score;
    ol.appendChild(li);
  });
}

// "Thinking…" indicator so LLM/processing latency reads as work, not a freeze.
function showThinking() {
  const div = document.createElement("div");
  div.className = "msg bot thinking";
  div.id = "thinkingMsg";
  div.innerHTML = '<span class="dots"><span></span><span></span><span></span></span> thinking…';
  $("messages").appendChild(div);
  $("messages").scrollTop = $("messages").scrollHeight;
}
function hideThinking() {
  const t = $("thinkingMsg");
  if (t) t.remove();
}

async function reset() {
  const data = await post("/api/reset", {
    user_profile: {
      purchase_frequency: "3-4 prior purchases",
      average_prior_rating: 5.0,
      rating_style: "usually positive",
      preference_tags: ["material", "fit"],
      summary: "demo profile",
    },
  });
  sessionId = data.session_id;
  turn = 0;
  $("messages").innerHTML = "";
  renderState(data.state || {}, null, null, null);
  renderRecs([]);
  addMessage("New session started. Tell me what you're shopping for.", "bot");
}

async function send(text) {
  if (!sessionId || !text.trim()) return;
  turn = Math.min(turn + 1, 10);
  addMessage(text, "user");
  showThinking();
  let data;
  try {
    data = await post("/api/respond", { session_id: sessionId, message: text, turn });
  } finally {
    hideThinking();
  }
  addMessage(data.message || "(no message)", "bot", data.ask_attribute);
  renderState(data.state || {}, data.intent, data.ask_attribute, data.candidate_count);
  renderRecs(data.recommendations);
}

$("composer").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("input").value;
  $("input").value = "";
  send(v);
});
$("resetBtn").addEventListener("click", reset);
document.querySelectorAll(".samples button").forEach((b) =>
  b.addEventListener("click", () => send(b.getAttribute("data-s")))
);

reset();
