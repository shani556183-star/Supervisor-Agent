'use strict';

const HEALTH_META = {
  ok: { label: 'Theek hai', color: '#1a7f37', bg: '#dafbe1', border: '#4ac26b', icon: '✅' },
  warning: { label: 'Dhyan do', color: '#9a6700', bg: '#fff8c5', border: '#d4a72c', icon: '⚠️' },
  no_run: { label: 'Aaj nahi chala', color: '#57606a', bg: '#eaeef2', border: '#8c959f', icon: '⏸️' },
  error: { label: 'Masla hai', color: '#cf222e', bg: '#ffebe9', border: '#e5534b', icon: '❌' },
};

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function badge(health) {
  const h = HEALTH_META[health] || HEALTH_META.no_run;
  return `<span class="badge" style="color:${h.color};background:${h.bg}">${h.icon} ${esc(h.label)}</span>`;
}

function renderAgentCard(agent) {
  const h = HEALTH_META[agent.health] || HEALTH_META.no_run;

  const flagsHtml = agent.flags && agent.flags.length
    ? `<div class="flags">
        <div class="flags-title">⚠️ Iss par tumhari nazar chahiye:</div>
        <ul>${agent.flags.map((f) => `<li>${esc(f.message)}</li>`).join('')}</ul>
      </div>`
    : '';

  const notesHtml = agent.notes && agent.notes.length
    ? `<ul class="notes">${agent.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : `<p class="notes-empty">Koi extra detail nahi.</p>`;

  const errorSamplesHtml = agent.errorSamples && agent.errorSamples.length
    ? `<details class="raw-details">
        <summary>Technical error details dekhein (${agent.errorSamples.length})</summary>
        <pre>${agent.errorSamples.map(esc).join('\n')}</pre>
      </details>`
    : '';

  const lastActivity = agent.lastActivity ? new Date(agent.lastActivity).toLocaleString('en-GB') : 'Pata nahi';

  return `
  <div class="card" style="border-left-color:${h.border}">
    <div class="card-header">
      <h2>${esc(agent.displayName)}</h2>
      ${badge(agent.health)}
    </div>
    <div class="meta">Chalta hai: ${esc(agent.runsOn)} &nbsp;•&nbsp; Last activity: ${esc(lastActivity)}</div>
    ${flagsHtml}
    <div class="notes-block">
      <div class="notes-title">Aaj kya hua:</div>
      ${notesHtml}
    </div>
    ${errorSamplesHtml}
  </div>`;
}

function overallHealth(agents) {
  if (agents.some((a) => a.health === 'error')) return 'error';
  if (agents.some((a) => a.flags && a.flags.length > 0)) return 'warning';
  if (agents.some((a) => a.health === 'no_run')) return 'warning';
  return 'ok';
}

function generateReport(agents, dateStr, opts = {}) {
  const { generatedAt = new Date(), isLive = false } = opts;

  const okCount = agents.filter((a) => a.health === 'ok').length;
  const warnCount = agents.filter((a) => a.health === 'warning').length;
  const stoppedCount = agents.filter((a) => a.health === 'no_run').length;
  const errorCount = agents.filter((a) => a.health === 'error').length;
  const needsAttention = warnCount + stoppedCount + errorCount;

  const summaryHealth = overallHealth(agents);
  const summaryText = needsAttention > 0
    ? `${needsAttention} agent(s) par tumhari nazar chahiye.`
    : `Sab ${agents.length} agents theek chal rahe hain, kuch bhi urgent nahi.`;

  const generatedAtStr = new Date(generatedAt).toLocaleString('en-GB');
  const cardsHtml = agents.map(renderAgentCard).join('\n');

  const refreshNote = isLive
    ? `<span id="live-tag">🟢 Live dashboard — Refresh button dabate hi naya data aayega</span>`
    : `<span id="live-tag">📄 Saved copy — naya data lene ke liye "Check My Agents" icon dobara chalao</span>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<title>Supervisor Dashboard — ${esc(dateStr)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #f6f8fa; color: #1f2328;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 24px 16px 60px;
  }
  .container { max-width: 780px; margin: 0 auto; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
  header h1 { font-size: 23px; margin: 0 0 4px; }
  header .date { color: #57606a; font-size: 14px; }
  .refresh-btn {
    background: #1a7f37; color: #fff; border: none; border-radius: 8px;
    padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08);
  }
  .refresh-btn:hover { background: #166a2f; }
  .refresh-btn:active { transform: translateY(1px); }
  .gen-info { font-size: 12px; color: #8b949e; margin-top: 6px; text-align: right; }
  #live-tag { display: block; }

  .glance {
    background: #fff; border: 1px solid #d0d7de; border-radius: 12px;
    padding: 16px 18px; margin-bottom: 20px;
  }
  .glance-headline {
    font-size: 15.5px; font-weight: 600; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .stat-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .stat-pill {
    flex: 1; min-width: 130px; border-radius: 10px; padding: 10px 14px;
    display: flex; flex-direction: column; gap: 2px;
  }
  .stat-pill .n { font-size: 22px; font-weight: 700; }
  .stat-pill .l { font-size: 12px; opacity: 0.85; }
  .pill-ok { background: #dafbe1; color: #1a7f37; }
  .pill-warn { background: #fff8c5; color: #9a6700; }
  .pill-stopped { background: #eaeef2; color: #57606a; }
  .pill-error { background: #ffebe9; color: #cf222e; }

  .card {
    background: #fff; border: 1px solid #d0d7de; border-left: 5px solid #d0d7de; border-radius: 10px;
    padding: 18px 20px; margin-bottom: 16px;
  }
  .card-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .card-header h2 { font-size: 17px; margin: 0; }
  .badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
  .meta { color: #57606a; font-size: 12.5px; margin: 6px 0 12px; }
  .flags { background: #fff8c5; border: 1px solid #d4a72c33; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
  .flags-title { font-weight: 600; font-size: 13.5px; color: #7d5a00; margin-bottom: 4px; }
  .flags ul { margin: 4px 0 0; padding-left: 18px; font-size: 13.5px; color: #4d3800; }
  .notes-title { font-weight: 600; font-size: 13.5px; margin-bottom: 4px; color: #1f2328; }
  .notes { margin: 4px 0 0; padding-left: 18px; font-size: 14px; line-height: 1.5; }
  .notes-empty { color: #57606a; font-size: 13.5px; margin: 4px 0 0; }
  .raw-details { margin-top: 10px; font-size: 12.5px; color: #57606a; }
  .raw-details pre { white-space: pre-wrap; word-break: break-word; background: #f6f8fa; padding: 8px 10px; border-radius: 6px; margin-top: 6px; }
  footer { text-align: center; color: #8b949e; font-size: 12px; margin-top: 30px; }
  @media (max-width: 480px) {
    header { flex-direction: column; }
    .refresh-btn { width: 100%; }
  }
</style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>📋 Supervisor Dashboard</h1>
        <div class="date">${esc(dateStr)}</div>
      </div>
      <div>
        <button class="refresh-btn" id="refresh-btn" onclick="location.reload(true)">🔄 Refresh</button>
        <div class="gen-info">Last generated: ${esc(generatedAtStr)}<br>${refreshNote}</div>
      </div>
    </header>

    <div class="glance">
      <div class="glance-headline">${summaryHealth === 'ok' ? '✅' : summaryHealth === 'warning' ? '⚠️' : '❌'} ${esc(summaryText)}</div>
      <div class="stat-row">
        <div class="stat-pill pill-ok"><span class="n">${okCount}</span><span class="l">theek chal rahe hain</span></div>
        <div class="stat-pill pill-warn"><span class="n">${warnCount}</span><span class="l">dhyan chahiye</span></div>
        <div class="stat-pill pill-stopped"><span class="n">${stoppedCount}</span><span class="l">aaj nahi chale</span></div>
        <div class="stat-pill pill-error"><span class="n">${errorCount}</span><span class="l">masla hai</span></div>
      </div>
    </div>

    ${cardsHtml}
    <footer>Supervisor Agent sirf padhta aur report karta hai — koi bhi agent ka code ya data khud nahi badalta.</footer>
  </div>
<script>
  // If this file was opened directly (double-click / static archive), a plain
  // reload just re-shows the same saved snapshot — that's not what "Refresh"
  // promises. So on a saved copy, the button instead tries to jump straight
  // to the live dashboard (server started by the "Check My Agents" icon).
  if (location.protocol === 'file:') {
    var tag = document.getElementById('live-tag');
    if (tag) tag.textContent = '📄 Saved copy — Refresh dabao to live dashboard khulne ki koshish karega';
    var btn = document.getElementById('refresh-btn');
    if (btn) {
      btn.textContent = '🔄 Refresh (live dashboard kholo)';
      btn.onclick = function () {
        window.location.href = 'http://127.0.0.1:47983/';
      };
    }
  }
</script>
</body>
</html>`;
}

module.exports = { generateReport };
