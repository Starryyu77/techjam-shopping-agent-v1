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

function renderState(state, askAttr, poolCount) {
  chips("hard", state.hard_constraints);
  chips("soft", state.soft_preferences);
  chips("neg", state.negative_constraints);
  chips("cat", state.category ? [state.category] : []);

  // derive a human strategy label from the state
  const hasHard = state.hard_constraints && Object.keys(state.hard_constraints).length;
  let strategy = "browsing · clarify";
  if (state.status === "selected") strategy = "selected";
  else if (state.status === "stopped") strategy = "stopped";
  else if (askAttr) strategy = hasHard ? "buying · narrow" : "browsing · clarify";
  else strategy = "recommend · focused";

  $("pillIntent").innerHTML = "intent <b>" + (hasHard ? "buying" : "browsing") + "</b>";
  $("pillStrategy").innerHTML = "strategy <b>" + strategy + "</b>";
  $("pillTurn").innerHTML = "turn <b>" + turn + "</b>/10";
  $("pillPool").innerHTML = "candidates <b>" + (poolCount != null ? poolCount : "—") + "</b>";
}

function renderRecs(recs) {
  const ol = $("recs");
  ol.innerHTML = "";
  (recs || []).forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML =
      '<span class="rank">' + (i + 1) + "</span>" +
      '<span><span class="t">' + (r.title || r.parent_asin) + "</span><br>" +
      '<span class="asin">' + r.parent_asin + "</span></span>";
    ol.appendChild(li);
  });
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
  renderState(data.state || {}, null, null);
  renderRecs([]);
  addMessage("New session started. Tell me what you're shopping for.", "bot");
}

async function send(text) {
  if (!sessionId || !text.trim()) return;
  turn += 1;
  addMessage(text, "user");
  const data = await post("/api/respond", { session_id: sessionId, message: text, turn });
  addMessage(data.message || "(no message)", "bot", data.ask_attribute);
  renderState(data.state || {}, data.ask_attribute, data.candidate_count);
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
